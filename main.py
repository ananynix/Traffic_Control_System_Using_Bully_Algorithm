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
        self.alert_msg = "" # Side alert box message for the UI

nodes = {i: Node(i) for i in range(1, 6)}
# Global to track if a monitoring loop is already running
monitoring_node_id = None

@app.get("/status")
def get_status():
    return {
        str(id): {
            "alive": n.is_alive, 
            "coordinator": n.is_coordinator, 
            "transmission": n.current_transmission,
            "alert": n.alert_msg
        } for id, n in nodes.items()
    }

@app.post("/kill/{node_id}")
def kill_node(node_id: int):
    nodes[node_id].is_alive = False
    nodes[node_id].is_coordinator = False
    nodes[node_id].current_transmission = None
    nodes[node_id].alert_msg = ""
    return {"status": "killed"}

@app.post("/recover/{node_id}")
def recover_node(node_id: int, background_tasks: BackgroundTasks):
    nodes[node_id].is_alive = True
    # If a high ID recovers, it challenges the current leader
    background_tasks.add_task(run_bully, node_id, background_tasks)
    return {"status": "recovered"}

@app.post("/reset")
def reset():
    global nodes, monitoring_node_id
    nodes = {i: Node(i) for i in range(1, 6)}
    monitoring_node_id = None
    return {"status": "reset"}

@app.post("/start-election/{node_id}")
async def start_election(node_id: int, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_bully, node_id, background_tasks)
    return {"status": "started"}

async def monitor_system(coord_id):
    """Background task: Coordinator senses offline nodes and reinstates them."""
    global monitoring_node_id
    monitoring_node_id = coord_id
    
    try:
        while nodes[coord_id].is_coordinator and nodes[coord_id].is_alive:
            for target_id, node in nodes.items():
                if target_id != coord_id and not node.is_alive:
                    # Stage 1: Initial Detection
                    nodes[coord_id].alert_msg = f"FAULT AT ID:{target_id}!"
                    await asyncio.sleep(3)
                    
                    # Stage 2: External Communication
                    nodes[coord_id].alert_msg = "SYNCING WITH ELECTRIC GRID..."
                    await asyncio.sleep(4)
                    
                    # Stage 3: Remote Reboot Command
                    nodes[coord_id].alert_msg = "INITIATING REMOTE REBOOT..."
                    await asyncio.sleep(5)
                    
                    # Final Act: Reinstate
                    node.is_alive = True
                    nodes[coord_id].alert_msg = f"ID:{target_id} ONLINE!"
                    await asyncio.sleep(3)
                    nodes[coord_id].alert_msg = ""
                    
            await asyncio.sleep(1) # Heartbeat interval
            
    except asyncio.CancelledError:
        # This part runs when you press CTRL+C
        print(f"Monitor task for Node {coord_id} was cancelled safely.")
    finally:
        if monitoring_node_id == coord_id:
            monitoring_node_id = None

async def run_bully(starter_id, background_tasks: BackgroundTasks):
    if not nodes[starter_id].is_alive: return
    
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
            await run_bully(h_id, background_tasks)
            return

    if not any_higher_alive:
        # I am the Winner
        for id, n in nodes.items():
            n.is_coordinator = (id == starter_id)
            if id != starter_id and n.is_alive:
                nodes[starter_id].current_transmission = {"to": id, "type": "COORDINATOR"}
                await asyncio.sleep(0.3)
        
        await asyncio.sleep(1.5)
        nodes[starter_id].current_transmission = None
        
        # Start the Health Monitor for the new Coordinator
        background_tasks.add_task(monitor_system, starter_id)