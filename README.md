# 🚥 Traffic Control System: Distributed Bully Algorithm

An interactive, arcade-style simulation of the **Bully Algorithm** in a distributed computing environment. This project visualizes how independent nodes (Traffic Signals) coordinate to elect a leader, handle node failures, and manage real-time message passing with a retro 8-bit aesthetic.



---

## 🕹️ The Arcade Experience

The frontend is designed to mimic a classic arcade cabinet. It transforms a complex theoretical concept into an engaging visual game-play experience:
* **Neon Visuals:** High-contrast "Radiant Violet" and "Lilac Mist" color palette.
* **8-Bit Typography:** Uses the `Press Start 2P` font for that authentic retro feel.
* **Dynamic Animations:** * **Signal Pulses:** Real-time data packets (ELECTION, OK, COORDINATOR) travel along dashed network paths.
    * **Interactive Toggling:** Nodes physically change state (Grey/Offline vs. Glowing/Leader) based on system health.
    * **Floating UI:** Buttons and headers feature smooth, floating animations for an "attract mode" feel.

---

## ⚙️ Core Functionality: The Bully Algorithm

This project implements a robust version of the **Bully Algorithm**, a method in distributed computing for dynamically electing a coordinator by using node IDs.

### 📜 Election Rules:
1.  **Initiation:** When a node notices the coordinator is down, or a higher-priority node recovers, it sends an `ELECTION` message to all nodes with a higher ID.
2.  **Response:** If a higher node is alive, it sends an `OK` back and takes over the election.
3.  **Victory:** If no higher nodes respond, the initiating node wins. It sends a `COORDINATOR` message to all lower-ID nodes to claim leadership.
4.  **Recovery:** If a "killed" node recovers and has a higher ID than the current leader, it immediately "bullies" its way into leadership, ensuring the system always follows the highest-priority available node.

---

## 🛠️ Tech Stack

### **Backend (The Engine)**
* **FastAPI:** A high-performance Python framework used to simulate the distributed nodes as independent state objects.
* **Asynchronous Logic (`asyncio`):** Manages the non-blocking "travel time" of messages between nodes.
* **Pydantic:** Ensures strict data modeling for node states and transmissions.

### **Frontend (The Cabinet)**
* **React.js:** Manages the complex state of 5 interacting nodes and real-time UI updates.
* **SVG (Scalable Vector Graphics):** Handles the entire game board, including the pentagonal node layout and animated `textPath` transmissions.
* **Axios:** Handles the polling mechanism to keep the frontend perfectly synced with the backend's distributed state.
* **Google Fonts API:** Integrated `Press Start 2P` for the pixel-art aesthetic.

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/traffic-control-bully.git
cd traffic-control-bully
```

### 2. Setup Backend
```bash
cd backend
pip install fastapi uvicorn
uvicorn main:app --reload
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm start
```

---

## 🎮 How to Play
1.  **Start Election:** Click the "START ELECTION" button to watch Node 1 initiate the process.
2.  **Kill Nodes:** Use the `KILL` button on any node (especially the Leader) to see how the remaining nodes detect the fault and re-elect a new coordinator.
3.  **Recover Nodes:** Click `REC` on an offline node. If it's a high-ID node, watch it automatically take over the system.
4.  **Watch the Signals:** Observe the color-coded balls and text stamps moving between nodes—each color corresponds to the specific ID of the sender.

---

## 📊 System Architecture

The system operates on a **Request-Response Polling Architecture**. The backend maintains the "Truth" of the distributed system, while the React frontend polls the `/status` endpoint every 500ms to render the current "Frame" of the election process.
