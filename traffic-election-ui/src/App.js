import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = "http://localhost:8000";
const POSITIONS = [
    { x: 400, y: 150 }, { x: 650, y: 300 }, { x: 550, y: 550 }, 
    { x: 250, y: 550 }, { x: 150, y: 300 }
];

const SIGNAL_COLORS = { 
    1: "#208407", 2: "#b50e0e", 3: "#0d00ff", 4: "#FF8C00", 5: "#de4c7f" 
};

// Fixed position for the central Police Server HQ
const HQ_POS = { x: 400, y: 720 };

export default function App() {
    const [nodes, setNodes] = useState({});
    const [lightPhase, setLightPhase] = useState(0);

    useEffect(() => {
        const dataInterval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_BASE}/status`);
                setNodes(res.data);
            } catch (e) { console.error("System connection interrupted"); }
        }, 500);
        
        const lightInterval = setInterval(() => {
            setLightPhase(prev => (prev + 1) % 3);
        }, 3000);

        return () => { clearInterval(dataInterval); clearInterval(lightInterval); };
    }, []);

    const toggleNode = (id) => {
        const endpoint = nodes[id]?.alive ? `/kill/${id}` : `/recover/${id}`;
        axios.post(`${API_BASE}${endpoint}`);
    };

    return (
        <div style={{ 
            backgroundColor: '#edcbf6', minHeight: '100vh', width: '100vw', 
            overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
                
                @keyframes btn-float {
                    0%, 100% { transform: translateY(0px); box-shadow: 0 5px #a87e7e; }
                    50% { transform: translateY(-5px); box-shadow: 0 10px #a87e7e; }
                }

                @keyframes siren-flash {
                    0%, 100% { fill: red; }
                    50% { fill: blue; }
                }

                .arcade-title { font-family: 'Press Start 2P', cursive; font-size: 36px; color: #bc3fde; margin: 30px 0 10px 0; white-space: nowrap; }
                .sub-title { font-family: 'Press Start 2P', cursive; font-size: 12px; color: #4A148C; margin-bottom: 10px; }

                .main-btn { 
                    font-family: 'Press Start 2P', cursive; font-size: 14px; padding: 15px 30px; margin: 0 15px; border-radius: 50px; 
                    border: 4px solid #4A148C; cursor: pointer; background: #ffc2c2; color: #4A148C;
                    animation: btn-float 3s infinite ease-in-out; box-shadow: 0 5px #a87e7e;
                }
                .kill-btn { font-family: 'Press Start 2P', cursive; font-size: 8px; border: 2px solid black; cursor: pointer; border-radius: 4px; padding: 4px; color: white; }
            `}</style>

            <h1 className="arcade-title">TRAFFIC CONTROL SYSTEM</h1>
            <h2 className="sub-title">MUMBAI SMART GRID & POLICE SERVER</h2>

            <svg width="800" height="780" viewBox="0 0 800 800" style={{ flex: 1, position: 'relative' }}>
                
                {/* Dotted lines connecting traffic nodes */}
                {POSITIONS.map((p, i) => POSITIONS.map((p2, j) => i !== j && (
                    <line key={`${i}-${j}`} x1={p.x} y1={p.y} x2={p2.x} y2={p2.y} stroke="#333" strokeWidth="2" strokeDasharray="10,5" opacity="0.4" />
                )))}

                {/* Central M.P.D. Control Server */}
                <g transform={`translate(${HQ_POS.x}, ${HQ_POS.y})`}>
                    <rect x="-120" y="-40" width="240" height="80" rx="10" fill="#0b0b1a" stroke="#00ffff" strokeWidth="4" filter="drop-shadow(0 0 10px #00ffff)" />
                    <rect x="-100" y="-20" width="200" height="15" fill="#1a1a2e" />
                    <text y="5" textAnchor="middle" fill="#00ffff" fontSize="14" fontFamily="'Press Start 2P'">M.P.D. SERVER</text>
                    <text y="25" textAnchor="middle" fill="white" fontSize="8" fontFamily="'Press Start 2P'">DISPATCH CONTROL</text>
                    <circle cx="-90" cy="-12" r="4" fill="red"><animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite"/></circle>
                    <circle cx="90" cy="-12" r="4" fill="blue"><animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite"/></circle>
                </g>

                {/* Transmissions */}
                {Object.keys(nodes).map(id => {
                    const tx = nodes[id].transmission;
                    if (!tx) return null;
                    const start = POSITIONS[id - 1], end = POSITIONS[tx.to - 1];
                    const dynamicColor = SIGNAL_COLORS[id] || "#bc3fde";

                    return (
                        <g key={`tx-${id}`}>
                            <circle r="10" fill={dynamicColor} style={{ filter: `drop-shadow(0 0 5px ${dynamicColor})` }}>
                                <animateMotion dur="0.6s" repeatCount="indefinite" path={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} />
                            </circle>
                            <text fontSize="11" fill={dynamicColor} fontFamily="'Press Start 2P'" style={{ fontWeight: 'bold' }}>
                                <textPath href={`#p-${id}-${tx.to}`} startOffset="50%" textAnchor="middle">{tx.type}</textPath>
                            </text>
                            <path id={`p-${id}-${tx.to}`} d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} fill="none" />
                        </g>
                    );
                })}

                {/* Nodes & Dispatching Police Officers */}
                {Object.keys(nodes).map((id, index) => {
                    const node = nodes[id], pos = POSITIONS[index], isDead = !node.alive;
                    const isCoord = node.coordinator;

                    // Trajectory logic: Officer sits at HQ when IDLE, moves to Node when DISPATCHED, and returns to HQ when RETURNING
                    const policePos = 
                        node.police === "IDLE" ? HQ_POS :
                        node.police === "DISPATCHED" ? { x: pos.x - 55, y: pos.y + 40 } :
                        HQ_POS;
                    
                    const showPolice = node.police !== "IDLE";

                    return (
                        <g key={id}>
                            {/* Police Officer Group - Transition handles the running animation between HQ and Node */}
                            <g style={{ 
                                transform: `translate(${policePos.x}px, ${policePos.y}px)`, 
                                transition: 'transform 2s ease-in-out',
                                opacity: showPolice ? 1 : 0 
                            }}>
                                <circle cx="10" cy="-5" r="15" fill="#111" />
                                <text x="0" y="0" fontSize="20">👮‍♂️</text>
                                <text x="-5" y="15" fontSize="8" fill="cyan" fontFamily="'Press Start 2P'">M.P.D.</text>
                                {/* Flashing Siren when dispatched */}
                                {node.police === "DISPATCHED" && (
                                    <circle cx="10" cy="-25" r="4" style={{ animation: 'siren-flash 0.5s infinite' }} />
                                )}
                            </g>

                            <g transform={`translate(${pos.x}, ${pos.y})`}>
                                {/* Grid Alert Message Box */}
                                {isCoord && node.alert && (
                                    <g transform="translate(45, -40)">
                                        <rect width="320" height="60" rx="5" fill="#111" stroke="cyan" strokeWidth="2" opacity="0.9" />
                                        <text x="10" y="25" fill="#bc3fde" fontSize="8" fontFamily="'Press Start 2P'">ALERT:</text>
                                        <text x="10" y="45" fill="#ffff00" fontSize="7" fontFamily="'Press Start 2P'">{node.alert}</text>
                                    </g>
                                )}

                                {/* Mumbai Location Name */}
                                <text y="-90" textAnchor="middle" fill="#00BFFF" fontSize="10" fontFamily="'Press Start 2P'">
                                    {node.location}
                                </text>

                                {/* Node Chassis */}
                                <rect x="-30" y="-55" width="60" height="110" 
                                    fill={isCoord ? "#bc3fde" : "#111"} 
                                    rx="8" 
                                    stroke={isCoord ? "white" : (isDead ? "red" : "#444")} 
                                    strokeWidth={isCoord ? "5" : "3"} 
                                    style={{ transition: 'fill 0.3s ease, stroke 0.3s ease', filter: isCoord ? 'drop-shadow(0 0 12px #bc3fde)' : 'none' }}
                                />
                                
                                <circle cy="-30" r="10" fill={isDead ? "#222" : (lightPhase === 2 ? "#FF0000" : "#111")} stroke="#000" />
                                <circle cy="0" r="10" fill={isDead ? "#333" : (lightPhase === 1 ? "#FFD700" : "#111")} stroke="#000" />
                                <circle cy="30" r="10" fill={!isDead && lightPhase === 0 ? "#00FF00" : "#111"} stroke="#000" />
                                
                                <text y="-70" textAnchor="middle" fill="#4A148C" fontSize="10" fontFamily="'Press Start 2P'">ID:{id}</text>
                                
                                <foreignObject x="-40" y="65" width="80" height="40">
                                    <button onClick={() => toggleNode(id)} className="kill-btn" style={{ background: isDead ? '#4CAF50' : '#f44336' }}>
                                        {isDead ? "REC" : "KILL"}
                                    </button>
                                </foreignObject>
                            </g>
                        </g>
                    );
                })}
            </svg>

            <div style={{ display: 'flex', paddingBottom: '30px' }}>
                <button onClick={() => axios.post(`${API_BASE}/start-election/1`)} className="main-btn">START ELECTION</button>
                <button onClick={() => axios.post(`${API_BASE}/reset`)} className="main-btn">RESET SYSTEM</button>
            </div>
        </div>
    );
}