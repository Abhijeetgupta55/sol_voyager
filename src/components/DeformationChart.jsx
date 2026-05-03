"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, YAxis as RechartsYAxis } from "recharts";

export default function DeformationChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="deformation-chart card" style={{ height: "200px", width: "100%", marginTop: "1rem", padding: "1rem" }}>
      <h4 style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.5rem" }}>
        <i className="fas fa-history"></i> Cumulative Displacement (mm)
      </h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: "12px" }}
            itemStyle={{ color: "#3b82f6" }}
          />
          <Line 
            type="monotone" 
            dataKey="displacement" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            dot={{ r: 3, fill: "#3b82f6" }}
            activeDot={{ r: 5 }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
