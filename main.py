from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import asyncio

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Location mapping for Mumbai
LOCATIONS = {1: "Andheri", 2: "Vile Parle", 3: "Juhu", 4: "D.N. Nagar", 5: "Bandra"}

class Node:
    def __init__(self, node_id):
        self.id = node_id
        self.location = LOCATIONS[node_id]
        self.is_alive = True
        self.is_coordinator = False
        self.current_transmission = None
        self.alert_msg = ""
        self.police_status = "IDLE" # IDLE, DISPATCHED, RETURNING

nodes = {i: Node(i) for i in range(1, 6)}
monitoring_node_id = None

@app.get("/status")
def get_status():
    return {
        str(id): {
            "alive": n.is_alive, 
            "coordinator": n.is_coordinator, 
            "transmission": n.current_transmission,
            "alert": n.alert_msg,
            "location": n.location,
            "police": n.police_status
        } for id, n in nodes.items()
    }

@app.post("/kill/{node_id}")
def kill_node(node_id: int):
    nodes[node_id].is_alive = False
    nodes[node_id].is_coordinator = False
    nodes[node_id].current_transmission = None
    nodes[node_id].alert_msg = ""
    # Police Server Detects Fault -> Dispatch Officer
    nodes[node_id].police_status = "DISPATCHED"
    return {"status": "killed"}

async def handle_police_return(node_id):
    """Background task to handle the cop running off-screen"""
    nodes[node_id].police_status = "RETURNING"
    await asyncio.sleep(3) # Wait for animation to finish
    nodes[node_id].police_status = "IDLE"

@app.post("/recover/{node_id}")
def recover_node(node_id: int, background_tasks: BackgroundTasks):
    nodes[node_id].is_alive = True
    background_tasks.add_task(handle_police_return, node_id)
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
                    # Stage 1: Detection (4 Seconds)
                    nodes[coord_id].alert_msg = f"FAULT AT {node.location.upper()}!"
                    await asyncio.sleep(4)
                    
                    # Stage 2: Grid Sync (6 Seconds)
                    nodes[coord_id].alert_msg = "SYNCING WITH ELECTRIC GRID..."
                    await asyncio.sleep(6)
                    
                    # Stage 3: Remote Reboot (8 Seconds) - Total > 15s
                    nodes[coord_id].alert_msg = "INITIATING REMOTE REBOOT..."
                    await asyncio.sleep(8)
                    
                    # Final Act: Reinstate & Recall Police
                    node.is_alive = True
                    nodes[coord_id].alert_msg = f"{node.location.upper()} ONLINE!"
                    
                    # Send police back
                    node.police_status = "RETURNING"
                    await asyncio.sleep(3)
                    node.police_status = "IDLE"
                    nodes[coord_id].alert_msg = ""
                    
            await asyncio.sleep(1)
            
    except asyncio.CancelledError:
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
        for id, n in nodes.items():
            n.is_coordinator = (id == starter_id)
            if id != starter_id and n.is_alive:
                nodes[starter_id].current_transmission = {"to": id, "type": "COORDINATOR"}
                await asyncio.sleep(0.3)
        
        await asyncio.sleep(1.5)
        nodes[starter_id].current_transmission = None
        background_tasks.add_task(monitor_system, starter_id)