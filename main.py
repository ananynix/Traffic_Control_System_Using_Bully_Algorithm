from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import asyncio

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class Node:
    def __init__(self, node_id):
        self.id = node_id
        self.is_alive = True
        self.is_coordinator = False
        self.current_transmission = None

nodes = {i: Node(i) for i in range(1, 6)}

@app.get("/status")
def get_status():
    return {str(id): {"alive": n.is_alive, "coordinator": n.is_coordinator, "transmission": n.current_transmission} for id, n in nodes.items()}

@app.post("/kill/{node_id}")
def kill_node(node_id: int):
    nodes[node_id].is_alive = False
    nodes[node_id].is_coordinator = False
    nodes[node_id].current_transmission = None
    return {"status": "killed"}

@app.post("/recover/{node_id}")
def recover_node(node_id: int, background_tasks: BackgroundTasks):
    nodes[node_id].is_alive = True
    # If a high ID recovers, it should challenge the current leader
    background_tasks.add_task(run_bully, node_id)
    return {"status": "recovered"}

@app.post("/reset")
def reset():
    global nodes
    nodes = {i: Node(i) for i in range(1, 6)}
    return {"status": "reset"}

@app.post("/start-election/{node_id}")
async def start_election(node_id: int, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_bully, node_id)
    return {"status": "started"}

async def run_bully(starter_id):
    if not nodes[starter_id].is_alive: return
    
    # Reset existing coordinator status across the board before starting
    # This ensures that when a higher node takes over, the old one loses its highlight
    higher_ids = [id for id in nodes.keys() if id > starter_id]
    any_higher_alive = False

    for h_id in higher_ids:
        nodes[starter_id].current_transmission = {"to": h_id, "type": "ELECTION"}
        await asyncio.sleep(0.8)
        if nodes[h_id].is_alive:
            any_higher_alive = True
            nodes[h_id].current_transmission = {"to": starter_id, "type": "OK"}
            await asyncio.sleep(0.6)
            nodes[h_id].current_transmission = None
            nodes[starter_id].current_transmission = None
            await run_bully(h_id)
            return

    if not any_higher_alive:
        # I am the Bully now. Clear all other coordinators.
        for id, n in nodes.items():
            n.is_coordinator = (id == starter_id)
            if id != starter_id and n.is_alive:
                nodes[starter_id].current_transmission = {"to": id, "type": "COORDINATOR"}
                await asyncio.sleep(0.3)
        await asyncio.sleep(1.5)
        nodes[starter_id].current_transmission = None