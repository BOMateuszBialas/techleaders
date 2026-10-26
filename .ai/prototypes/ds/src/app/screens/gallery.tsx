import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ErrorState } from "@/components/ui/error-state";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TextLink } from "@/components/ui/text-link";
import { PageHead, type ScreenDef } from "../shared";

type Entry = { name: string; path: string; when: string; example: ReactNode };

/* One example per component from packages/app/src/components/ui/ (the 21 in the Storybook catalog). */
const entries: Entry[] = [
  { name: "Alert", path: "@/components/ui/alert", when: "A message for the whole form or page.", example: (
    <div className="flex flex-col gap-related">
      <Alert variant="info"><AlertTitle>Info</AlertTitle><AlertDescription>Simulated notice.</AlertDescription></Alert>
      <Alert variant="success"><AlertDescription>Added to cart.</AlertDescription></Alert>
      <Alert variant="warning"><AlertDescription>Only 3 left.</AlertDescription></Alert>
      <Alert variant="destructive"><AlertDescription>No order was placed.</AlertDescription></Alert>
      <Alert variant="demo"><AlertDescription>Demo store. Simulated data.</AlertDescription></Alert>
    </div>) },
  { name: "Alert dialog", path: "@/components/ui/alert-dialog", when: "A decision that cannot be undone.", example: (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive">Cancel order…</Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>Stock is returned to the products. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep order</AlertDialogCancel>
          <AlertDialogAction>Cancel order</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>) },
  { name: "Badge", path: "@/components/ui/badge", when: "A short status or marking, always with text.", example: (
    <div className="flex flex-wrap gap-related">
      <Badge variant="default">Default</Badge><Badge variant="secondary">Guest</Badge><Badge variant="outline">Account</Badge>
      <Badge variant="success">Paid</Badge><Badge variant="warning">Pending payment</Badge><Badge variant="destructive">Cancelled</Badge>
    </div>) },
  { name: "Button", path: "@/components/ui/button", when: "An action. The action variant is only for purchase steps.", example: (
    <div className="flex flex-wrap gap-related">
      <Button variant="action">Place demo order</Button><Button>Save</Button><Button variant="secondary">Back</Button>
      <Button variant="outline">Try again</Button><Button variant="ghost">Dismiss</Button><Button variant="destructive">Cancel order…</Button>
      <Button disabled>Out of stock</Button>
    </div>) },
  { name: "Card", path: "@/components/ui/card", when: "A group of related facts; no shadow (depth comes from the border).", example: (
    <Card className="max-w-sm"><CardHeader><CardDescription>Paid orders</CardDescription><CardTitle>27</CardTitle></CardHeader><CardContent>Orders with a payment date in the period.</CardContent></Card>) },
  { name: "Checkbox", path: "@/components/ui/checkbox", when: "A yes or no choice with its own label.", example: (
    <label className="flex items-center gap-related"><Checkbox /> I understand this is a demo payment.</label>) },
  { name: "Dialog", path: "@/components/ui/dialog", when: "A task that needs the page under it dimmed.", example: (
    <Dialog>
      <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Edit recommendation</DialogTitle><DialogDescription>Simulated dialog.</DialogDescription></DialogHeader>
        <DialogBody><p>Body text.</p></DialogBody>
        <DialogFooter><DialogClose render={<Button variant="outline">Close</Button>} /></DialogFooter>
      </DialogContent>
    </Dialog>) },
  { name: "Disclosure", path: "@/components/ui/disclosure", when: "Extra text that most people do not need.", example: (
    <Disclosure><DisclosureTrigger>How this number is defined</DisclosureTrigger><DisclosureContent><p className="type-small text-muted-foreground">Sum of the totals of paid orders.</p></DisclosureContent></Disclosure>) },
  { name: "Empty state", path: "@/components/ui/empty", when: "A list or page with no data, with one sentence.", example: (
    <Empty><EmptyHeader><EmptyTitle>You have no orders yet.</EmptyTitle><EmptyDescription>Orders you place appear here.</EmptyDescription></EmptyHeader><EmptyContent><TextLink href="#s02" variant="standalone">Shop all</TextLink></EmptyContent></Empty>) },
  { name: "Error state", path: "@/components/ui/error-state", when: "A page or section that could not load. No technical details.", example: (
    <ErrorState title="Your orders are unavailable." description="Try again in a moment." action={<Button variant="outline">Try again</Button>} />) },
  { name: "Field", path: "@/components/ui/field", when: "A label, control, hint and error together.", example: (
    <Field><FieldLabel htmlFor="ex-email">Email</FieldLabel><Input id="ex-email" type="email" aria-invalid /><FieldError>Enter a valid email address.</FieldError><FieldDescription>We send nothing: this is a demo.</FieldDescription></Field>) },
  { name: "Input", path: "@/components/ui/input", when: "A single line of text.", example: (
    <Field><FieldLabel htmlFor="ex-in">Search products</FieldLabel><Input id="ex-in" type="search" placeholder="Search by name" /></Field>) },
  { name: "Label", path: "@/components/ui/label", when: "The name of a control, always visible.", example: (
    <div className="flex flex-col gap-related"><Label htmlFor="ex-lab">Full name</Label><Input id="ex-lab" /></div>) },
  { name: "Native select", path: "@/components/ui/native-select", when: "A short fixed list (the browser's own picker).", example: (
    <NativeSelect aria-label="Category"><NativeSelectOption>All</NativeSelectOption><NativeSelectOption>Mice</NativeSelectOption><NativeSelectOption>Keyboards</NativeSelectOption></NativeSelect>) },
  { name: "Navigation menu", path: "@/components/ui/navigation-menu", when: "Store header with a megamenu of categories (desktop).", example: (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger href="#s02">Shop</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#s02">Shop all</NavigationMenuLink>
            <NavigationMenuLink href="#s02">Mice</NavigationMenuLink>
            <NavigationMenuLink href="#s02">Keyboards</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>) },
  { name: "Radio group", path: "@/components/ui/radio-group", when: "One choice from two to five options, all visible.", example: (
    <RadioGroup defaultValue="standard" aria-label="Delivery">
      <label className="flex items-center gap-related"><RadioGroupItem value="standard" /> Standard (not modelled)</label>
      <label className="flex items-center gap-related"><RadioGroupItem value="pickup" /> Pickup (not modelled)</label>
    </RadioGroup>) },
  { name: "Skeleton", path: "@/components/ui/skeleton", when: "The loading state of a page or section (one loading pattern, Q6).", example: (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-related"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-24 w-full" /></div>) },
  { name: "Table", path: "@/components/ui/table", when: "Rows that the owner compares; wraps on a phone.", example: (
    <Table><TableHeader><TableRow><TableHead>Reference</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
      <TableBody><TableRow><TableCell className="font-mono">DEMO-2026-0412</TableCell><TableCell className="text-right">947,00 zł</TableCell></TableRow></TableBody></Table>) },
  { name: "Tabs", path: "@/components/ui/tabs", when: "Switching between views of the same data (period, layout).", example: (
    <Tabs defaultValue="7"><TabsList aria-label="Period"><TabsTrigger value="7">Last 7 days</TabsTrigger><TabsTrigger value="30">Last 30 days</TabsTrigger></TabsList><TabsContent value="7">Showing 7 days.</TabsContent><TabsContent value="30">Showing 30 days.</TabsContent></Tabs>) },
  { name: "Textarea", path: "@/components/ui/textarea", when: "A longer free-text answer (the Copilot question).", example: (
    <Field><FieldLabel htmlFor="ex-ta">Your question</FieldLabel><Textarea id="ex-ta" maxLength={500} /><FieldDescription>0 / 500</FieldDescription></Field>) },
  { name: "Text link", path: "@/components/ui/text-link", when: "A link in running text or a standalone link.", example: (
    <p>Read the <TextLink href="#s17">Copilot rules</TextLink> before you ask.</p>) },
];

function GalleryPage() {
  return (
    <div className="flex flex-col gap-group">
      <PageHead
        title="Components"
        lead="Each example is the implemented component from packages/app/src/components/ui/, with its default look and one or two states. Simulated content."
        badge="21 components"
      />
      <div className="grid gap-group-item @md:grid-cols-2">
        {entries.map((e) => (
          <section key={e.name} className="flex flex-col gap-related rounded-card border border-border bg-card p-panel">
            <h2 className="font-heading type-h2">{e.name}</h2>
            <p className="type-small font-mono text-muted-foreground">{e.path}</p>
            <p className="type-small">{e.when}</p>
            <div className="pt-related">{e.example}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

export const galleryScreen: ScreenDef = {
  id: "components",
  title: "Components (21)",
  group: "Prototype",
  states: ["default"],
  render: () => <GalleryPage />,
};
