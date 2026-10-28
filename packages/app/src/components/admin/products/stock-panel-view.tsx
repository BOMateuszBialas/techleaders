import { MAX_STOCK_QUANTITY, type AdminProduct } from "@commerceos/core";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fieldDefault, type ActionState } from "@/lib/action-state";
import { fieldA11y } from "@/lib/field-a11y";
import {
  EMPTY_STOCK_HISTORY,
  NEW_STOCK_LABEL,
  SET_STOCK_BUTTON,
  STOCK_HEADING,
  STOCK_HISTORY_COLUMNS,
  STOCK_HISTORY_HEADING,
  STOCK_HISTORY_NOTE,
  stockPreview,
  type StockHistoryRow,
} from "./stock-copy";

export type StockPanelProduct = Pick<AdminProduct, "id" | "status" | "stockQuantity">;

export type StockPanelViewProps = {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
  product: StockPanelProduct;
  history: StockHistoryRow[];
};

/**
 * The form-level result: `role="alert"` for an error after a submit, `role="status"` for a
 * success, nothing before the first submit (Component decisions, form-level result).
 */
function StockFormResult({ state }: { state: ActionState }) {
  if (state.status === "error") {
    return (
      <Alert variant="destructive" role="alert">
        {state.message}
      </Alert>
    );
  }
  if (state.status === "success") {
    return (
      <Alert variant="success" role="status">
        {state.message}
      </Alert>
    );
  }
  return null;
}

/**
 * The stock panel in one given state (spec A15, UI/UX "Stock panel"): no hooks, so a unit test
 * renders every state directly; `StockPanel` connects it to `useActionState`.
 *
 * The form sends the quantity it showed (`expectedQuantity`) with the new one, so the server
 * applies the change only if nobody changed the stock meanwhile (A5). After a stale refusal
 * the action returns the current quantity as both values, and the panel shows it: the form is
 * reset to N. `noValidate` lets the server's message explain a refused value (for example
 * -1) under the field, the same way as every other admin form.
 */
export function StockPanelView({ action, state, pending, product, history }: StockPanelViewProps) {
  const errors = state.fieldErrors ?? {};
  const current = fieldDefault(state, "expectedQuantity", String(product.stockQuantity));

  return (
    <section aria-labelledby="stock-heading" className="flex max-w-xl flex-col gap-4">
      <h2 id="stock-heading" className="text-lg font-semibold">
        {STOCK_HEADING}
      </h2>
      <p className="text-sm">
        Current stock: <span className="font-medium">{current}</span>
      </p>
      {/* Remounted when the quantity it is based on changes, so the input starts from it. */}
      <form key={current} action={action} noValidate className="flex flex-col gap-3">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="expectedQuantity" value={current} />
        <Field>
          <FieldLabel htmlFor="stock-new-quantity">{NEW_STOCK_LABEL}</FieldLabel>
          <Input
            id="stock-new-quantity"
            name="newQuantity"
            type="number"
            inputMode="numeric"
            required
            min={0}
            max={MAX_STOCK_QUANTITY}
            step={1}
            defaultValue={fieldDefault(state, "newQuantity", current)}
            {...fieldA11y("stock-new-quantity-error", errors.newQuantity, ["stock-preview"])}
          />
          <FieldDescription id="stock-preview">{stockPreview(product.status)}</FieldDescription>
          <FieldError id="stock-new-quantity-error">{errors.newQuantity?.join(" ")}</FieldError>
        </Field>
        <StockFormResult state={state} />
        <div>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Setting stock…" : SET_STOCK_BUTTON}
          </Button>
        </div>
      </form>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">{STOCK_HISTORY_HEADING}</h3>
        <p className="text-sm text-muted-foreground">{STOCK_HISTORY_NOTE}</p>
        {history.length === 0 ? (
          <p className="text-sm">{EMPTY_STOCK_HISTORY}</p>
        ) : (
          // Phone: the table scrolls inside its own region, the page does not (B3.10).
          <div className="overflow-x-auto">
            <Table aria-label={STOCK_HISTORY_HEADING}>
              <TableCaption className="sr-only">{STOCK_HISTORY_HEADING}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{STOCK_HISTORY_COLUMNS.date}</TableHead>
                  <TableHead className="text-right">{STOCK_HISTORY_COLUMNS.change}</TableHead>
                  <TableHead className="text-right">{STOCK_HISTORY_COLUMNS.newQuantity}</TableHead>
                  <TableHead>{STOCK_HISTORY_COLUMNS.reason}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <time dateTime={row.at}>{row.atLabel}</time>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.delta}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.newQuantity}</TableCell>
                    <TableCell className="text-muted-foreground">{row.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}
