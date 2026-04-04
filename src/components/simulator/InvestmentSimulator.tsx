import { useState, useCallback, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters';
import { CHART_COLORS, TOOLTIP_STYLES } from '@/lib/constants';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SimulationInputs {
  initialAmount: string;
  monthlyContribution: string;
  annualRate: string;
  years: string;
}

interface YearDataPoint {
  year: number;
  label: string;
  accumulated: number;
  invested: number;
}

interface SimulationResult {
  finalValue: number;
  totalInvested: number;
  totalReturn: number;
  chartData: YearDataPoint[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function parseBRL(value: string): number {
  // Strip everything but digits, comma and period then parse
  const clean = value.replace(/[^\d,]/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

function computeSimulation(inputs: SimulationInputs): SimulationResult | null {
  const initial = parseBRL(inputs.initialAmount);
  const monthly = parseBRL(inputs.monthlyContribution);
  const annual = parseBRL(inputs.annualRate);
  const years = parseInt(inputs.years, 10);

  if (isNaN(years) || years <= 0 || annual < 0) return null;

  // Monthly rate derived from annual: (1 + annual/100)^(1/12) - 1
  const monthlyRate = Math.pow(1 + annual / 100, 1 / 12) - 1;

  const chartData: YearDataPoint[] = [];

  let accumulated = initial;
  let invested = initial;

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      accumulated = accumulated * (1 + monthlyRate) + monthly;
      invested += monthly;
    }
    chartData.push({
      year: y,
      label: `Ano ${y}`,
      accumulated: Math.round(accumulated * 100) / 100,
      invested: Math.round(invested * 100) / 100,
    });
  }

  const finalValue = accumulated;
  const totalInvested = invested;
  const totalReturn = finalValue - totalInvested;

  return { finalValue, totalInvested, totalReturn, chartData };
}

// ─── Result Cards ──────────────────────────────────────────────────────────────

function ResultCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'primary' | 'income' | 'neutral';
}) {
  const colorMap = {
    primary: 'text-cyan-400',
    income: 'text-emerald-400',
    neutral: 'text-foreground',
  } as const;

  const bgMap = {
    primary: 'border-cyan-500/30 bg-cyan-500/5',
    income: 'border-emerald-500/30 bg-emerald-500/5',
    neutral: 'border-border/50 bg-muted/20',
  } as const;

  const col = accent ?? 'neutral';

  return (
    <div className={`rounded-lg border p-4 ${bgMap[col]}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${colorMap[col]}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={TOOLTIP_STYLES}
      className="px-3 py-2 text-xs space-y-1"
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrencyCompact(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Form Fields ───────────────────────────────────────────────────────────────

interface FieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  min?: string;
  step?: string;
}

function SimField({ id, label, placeholder, value, onChange, suffix }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min="0"
          step="any"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={suffix ? 'pr-10' : ''}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Dialog ───────────────────────────────────────────────────────────────

export function InvestmentSimulator() {
  const [open, setOpen] = useState(false);
  const [inputs, setInputs] = useState<SimulationInputs>({
    initialAmount: '10000',
    monthlyContribution: '500',
    annualRate: '12',
    years: '10',
  });

  const setField = useCallback(
    (field: keyof SimulationInputs) => (value: string) =>
      setInputs((prev) => ({ ...prev, [field]: value })),
    []
  );

  const result = useMemo(() => computeSimulation(inputs), [inputs]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-white/20 bg-white/5 hover:bg-white/10 text-white gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Simulador
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Simulador de Investimentos
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          {/* Input grid */}
          <div className="grid grid-cols-2 gap-4">
            <SimField
              id="sim-initial"
              label="Valor inicial (R$)"
              placeholder="10.000"
              value={inputs.initialAmount}
              onChange={setField('initialAmount')}
            />
            <SimField
              id="sim-monthly"
              label="Aporte mensal (R$)"
              placeholder="500"
              value={inputs.monthlyContribution}
              onChange={setField('monthlyContribution')}
            />
            <SimField
              id="sim-rate"
              label="Taxa de juros anual"
              placeholder="12"
              value={inputs.annualRate}
              onChange={setField('annualRate')}
              suffix="%"
            />
            <SimField
              id="sim-years"
              label="Período"
              placeholder="10"
              value={inputs.years}
              onChange={setField('years')}
              suffix="anos"
            />
          </div>

          {/* Results */}
          {result ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <ResultCard label="Valor final" value={result.finalValue} accent="primary" />
                <ResultCard label="Total investido" value={result.totalInvested} accent="neutral" />
                <ResultCard label="Rendimento total" value={result.totalReturn} accent="income" />
              </div>

              {/* Chart */}
              <div>
                <p className="text-sm font-medium mb-3 text-muted-foreground">
                  Evolução ao longo do tempo
                </p>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={result.chartData}
                      margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={CHART_COLORS.grid}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        stroke={CHART_COLORS.text}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke={CHART_COLORS.text}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatCurrencyCompact}
                        width={68}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="top"
                        height={32}
                        formatter={(value) => (
                          <span className="text-foreground text-xs">{value}</span>
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="accumulated"
                        name="Valor acumulado"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, fill: CHART_COLORS.primary }}
                      />
                      <Line
                        type="monotone"
                        dataKey="invested"
                        name="Total investido"
                        stroke={CHART_COLORS.text}
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={{ r: 3, fill: CHART_COLORS.text }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Formula note */}
              <p className="text-xs text-muted-foreground text-center pb-1">
                Fórmula: taxa mensal = (1 + taxa anual)^(1/12) − 1 · juros compostos
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Preencha os campos acima para ver a simulação.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
