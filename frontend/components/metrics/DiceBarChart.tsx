"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MetricsPayload } from "@/lib/types";

export function DiceBarChart({ dicePerClass }: { dicePerClass: MetricsPayload["dice_per_class"] }) {
  const data = dicePerClass.map((d) => ({ ...d, dicePct: Math.round(d.dice * 1000) / 10 }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
        <CartesianGrid stroke="#263149" strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          unit="%"
          stroke="#94A3B8"
          tick={{ fill: "#94A3B8", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#263149" }}
        />
        <YAxis
          type="category"
          dataKey="label"
          stroke="#94A3B8"
          tick={{ fill: "#F8FAFC", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={150}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, "Dice score"]}
          contentStyle={{ background: "#141B2D", border: "1px solid #263149", borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: "#F8FAFC" }}
          cursor={{ fill: "#ffffff08" }}
        />
        <Bar dataKey="dicePct" radius={[0, 4, 4, 0]} barSize={22}>
          {data.map((d) => (
            <Cell key={d.key} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
