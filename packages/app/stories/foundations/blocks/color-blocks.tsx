import { useEffect, useRef, useState } from "react";
import { COLOR_GROUPS, CONTRAST_PAIRS, type ContrastPair } from "./token-data";
import { contrastRatio, measureColor } from "./contrast";

/** A documentation surface that follows the active theme (docs pages keep their own styles). */
export function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border bg-background p-panel text-foreground">{children}</div>
  );
}

function Swatch({ token }: { token: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-8 shrink-0 rounded-sm border border-input"
      style={{ background: `var(--${token})` }}
    />
  );
}

/** Every semantic color role with where to use it and where not to (tokeny.md §1b). */
export function ColorRoles() {
  return (
    <Surface>
      <div className="flex flex-col gap-group">
        {COLOR_GROUPS.map((group) => (
          <table key={group.title} className="w-full border-collapse type-small">
            <caption className="type-h3 mb-related text-left">{group.title}</caption>
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-4">
                  Token
                </th>
                <th scope="col" className="py-2 pr-4">
                  Use for
                </th>
                <th scope="col" className="py-2 pr-4">
                  Never for
                </th>
                <th scope="col" className="py-2">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {group.roles.map((role) => (
                <tr key={role.token} className="border-b align-top">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">
                    <span className="flex items-center gap-related">
                      <Swatch token={role.token} />
                      <code className="font-mono">--{role.token}</code>
                    </span>
                  </th>
                  <td className="py-2 pr-4">{role.use}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{role.avoid}</td>
                  <td className="py-2">{role.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </Surface>
  );
}

type Measured = { ratio: number; verdict: "pass" | "decorative" | "below" | "control" };

function judge([fg, , kind]: ContrastPair, ratio: number): Measured {
  if (kind === "X") return { ratio, verdict: "control" };
  if (ratio >= (kind === "T" ? 4.5 : 3)) return { ratio, verdict: "pass" };
  return { ratio, verdict: fg === "border" ? "decorative" : "below" };
}

const VERDICT_LABEL: Record<Measured["verdict"], string> = {
  pass: "Pass",
  decorative: "Below, decorative only (rule 12)",
  below: "Below threshold: fix before use",
  control: "Forbidden pairing (control)",
};

function measurePairs(scope: HTMLElement): Measured[] {
  const styles = getComputedStyle(scope);
  const color = (token: string) => measureColor(styles.getPropertyValue(`--${token}`).trim());
  return CONTRAST_PAIRS.map((pair) => judge(pair, contrastRatio(color(pair[0]), color(pair[1]))));
}

/**
 * Contrast of every text/background and UI pair in both themes, measured in the browser from
 * the real CSS variables (WCAG 2.x, truncated to two decimals like the contrast script).
 */
export function ContrastTable() {
  const light = useRef<HTMLDivElement>(null);
  const dark = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<{ light: Measured[]; dark: Measured[] } | null>(null);

  useEffect(() => {
    if (light.current && dark.current) {
      setRows({ light: measurePairs(light.current), dark: measurePairs(dark.current) });
    }
  }, []);

  return (
    <Surface>
      <div ref={light} className="light" hidden />
      <div ref={dark} className="dark" hidden />
      <table className="w-full border-collapse type-small">
        <caption className="type-h3 mb-related text-left">
          Measured contrast, light and dark (text 4.5:1, UI and large text 3:1)
        </caption>
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th scope="col" className="py-2 pr-4">
              Pair
            </th>
            <th scope="col" className="py-2 pr-4">
              Threshold
            </th>
            <th scope="col" className="py-2 pr-4">
              Light
            </th>
            <th scope="col" className="py-2 pr-4">
              Dark
            </th>
            <th scope="col" className="py-2">
              Where
            </th>
          </tr>
        </thead>
        <tbody>
          {CONTRAST_PAIRS.map((pair, index) => (
            <tr key={`${pair[0]}-${pair[1]}`} className="border-b align-top">
              <th scope="row" className="py-2 pr-4 text-left font-normal">
                <code className="font-mono">--{pair[0]}</code> on{" "}
                <code className="font-mono">--{pair[1]}</code>
              </th>
              <td className="py-2 pr-4">
                {pair[2] === "T" ? "Text 4.5" : pair[2] === "U" ? "UI 3" : "Control"}
              </td>
              <ResultCell result={rows?.light[index]} />
              <ResultCell result={rows?.dark[index]} />
              <td className="py-2 text-muted-foreground">{pair[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Surface>
  );
}

function ResultCell({ result }: { result: Measured | undefined }) {
  if (!result) return <td className="py-2 pr-4">Measuring…</td>;
  const flagged = result.verdict === "below";
  return (
    <td className={flagged ? "py-2 pr-4 font-semibold text-destructive" : "py-2 pr-4"}>
      <span className="tabular-nums">{result.ratio.toFixed(2)}:1</span>{" "}
      <span className="text-muted-foreground">{VERDICT_LABEL[result.verdict]}</span>
    </td>
  );
}
