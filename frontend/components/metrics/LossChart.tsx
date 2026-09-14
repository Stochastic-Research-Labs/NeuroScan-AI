"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function LossChart({
  epochs,
  trainLoss,
  valLoss,
}: {
  epochs: number[];
  trainLoss: number[];
  valLoss: number[];
}) {
  const data = epochs.map((epoch, i) => ({
    epoch,
    train: trainLoss[i],
    val: valLoss[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="#263149" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="epoch"
          stroke="#94A3B8"
          tick={{ fill: "#94A3B8", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#263149" }}
          label={{ value: "Epoch", position: "insideBottom", offset: -2, fill: "#94A3B8", fontSize: 12 }}
        />
        <YAxis stroke="#94A3B8" tick={{ fill: "#94A3B8", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#263149" }} />
        <Tooltip
          contentStyle={{ background: "#141B2D", border: "1px solid #263149", borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: "#F8FAFC" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
        <Line type="monotone" dataKey="train" name="Train loss" stroke="#22D3EE" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="val" name="Validation loss" stroke="#F59E0B" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
