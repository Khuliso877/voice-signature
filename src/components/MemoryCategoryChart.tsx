import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";

type MemoryFact = {
  id: string;
  category: string;
  fact: string;
  importance: "low" | "medium" | "high";
};

interface MemoryCategoryChartProps {
  memories: MemoryFact[];
}

const chartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--destructive))",
  "hsl(142 76% 36%)",
  "hsl(280 65% 60%)",
];

export function MemoryCategoryChart({ memories }: MemoryCategoryChartProps) {
  const chartData = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    
    memories.forEach((memory) => {
      const category = memory.category || "Uncategorized";
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [memories]);

  if (chartData.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
        Add memories to see your category breakdown
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
      >
        <XAxis 
          type="category" 
          dataKey="name" 
          tick={{ fontSize: 11 }}
          interval={0}
        />
        <YAxis type="number" allowDecimals={false} />
        <ChartTooltip
          content={<ChartTooltipContent />}
          cursor={{ fill: "hsl(var(--muted))" }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
