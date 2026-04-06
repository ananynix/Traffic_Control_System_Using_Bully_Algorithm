import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = "http://localhost:8000";
const POSITIONS = [
    { x: 400, y: 120 }, { x: 650, y: 300 }, { x: 550, y: 550 }, 
    { x: 250, y: 550 }, { x: 150, y: 300 }
];

// Custom colors assigned to each Node ID
const SIGNAL_COLORS = { 
    1: "#208407", // Green
    2: "#b50e0e", // Red
    3: "#0d00ff", // Blue
    4: "#FF8C00", // Orange
    5: "#de4c7f"  // Pink
};

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
            backgroundColor: '#edcbf6', height: '100vh', width: '100vw', 
            overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
                
                @keyframes btn-float {
                    0%, 100% { transform: translateY(0px); box-shadow: 0 5px #a87e7e; }
                    50% { transform: translateY(-5px); box-shadow: 0 10px #a87e7e; }
                }

                .arcade-title { 
                    font-family: 'Press Start 2P', cursive; 
                    font-size: 45.2px; 
                    color: #bc3fde; 
                    margin: 40px 0 20px 0; 
                    white-space: nowrap;
                }

                .main-btn { 
                    font-family: 'Press Start 2P', cursive; 
                    font-size: 14px; 
                    padding: 15px 30px; 
                    margin: 0 15px; 
                    border-radius: 50px; 
                    border: 4px solid #4A148C; 
                    cursor: pointer; 
                    background: #ffc2c2; 
                    color: #4A148C;
                    animation: btn-float 3s infinite ease-in-out;
                    box-shadow: 0 5px #a87e7e;
                }

                .kill-btn { font-family: 'Press Start 2P', cursive; font-size: 8px; border: 2px solid black; cursor: pointer; border-radius: 4px; padding: 4px; color: white; }
            `}</style>

            <h1 className="arcade-title">TRAFFIC CONTROL SYSTEM</h1>

            <svg width="800" height="600" viewBox="0 0 800 700" style={{ flex: 1 }}>
                {/* Dotted lines between nodes */}
                {POSITIONS.map((p, i) => POSITIONS.map((p2, j) => i !== j && (
                    <line key={`${i}-${j}`} x1={p.x} y1={p.y} x2={p2.x} y2={p2.y} stroke="#333" strokeWidth="2" strokeDasharray="10,5" opacity="0.4" />
                )))}

                {/* Transmissions - Dynamic Colors based on Sender ID */}
                {Object.keys(nodes).map(id => {
                    const tx = nodes[id].transmission;
                    if (!tx) return null;
                    const start = POSITIONS[id - 1], end = POSITIONS[tx.to - 1];
                    
                    // Pick the color assigned to the sending node
                    const dynamicColor = SIGNAL_COLORS[id] || "#bc3fde";

                    return (
                        <g key={`tx-${id}`}>
                            {/* The Signal Ball */}
                            <circle r="10" fill={dynamicColor} style={{ filter: `drop-shadow(0 0 5px ${dynamicColor})` }}>
                                <animateMotion dur="0.6s" repeatCount="indefinite" path={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} />
                            </circle>
                            
                            {/* The Signal Text */}
                            <text fontSize="11" fill={dynamicColor} fontFamily="'Press Start 2P'" style={{ fontWeight: 'bold' }}>
                                <textPath href={`#p-${id}-${tx.to}`} startOffset="50%" textAnchor="middle">
                                    {tx.type}
                                </textPath>
                            </text>
                            
                            <path id={`p-${id}-${tx.to}`} d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} fill="none" />
                        </g>
                    );
                })}

                {/* Nodes */}
                {Object.keys(nodes).map((id, index) => {
                    const node = nodes[id], pos = POSITIONS[index], isDead = !node.alive;
                    const isCoord = node.coordinator;

                    return (
                        <g key={id} transform={`translate(${pos.x}, ${pos.y})`}>
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
                            
                            <text y="-75" textAnchor="middle" fill="#4A148C" fontSize="10" fontFamily="'Press Start 2P'">ID:{id}</text>
                            
                            <foreignObject x="-40" y="65" width="80" height="40">
                                <button onClick={() => toggleNode(id)} className="kill-btn" style={{ background: isDead ? '#4CAF50' : '#f44336' }}>
                                    {isDead ? "REC" : "KILL"}
                                </button>
                            </foreignObject>
                        </g>
                    );
                })}
            </svg>

            <div style={{ display: 'flex', paddingBottom: '60px' }}>
                <button onClick={() => axios.post(`${API_BASE}/start-election/1`)} className="main-btn">START ELECTION</button>
                <button onClick={() => axios.post(`${API_BASE}/reset`)} className="main-btn">RESET SYSTEM</button>
            </div>
        </div>
    );
}