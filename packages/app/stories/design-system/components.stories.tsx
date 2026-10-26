import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ErrorState } from "@/components/ui/error-state";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { textLinkVariants } from "@/components/ui/text-link";
import { Textarea } from "@/components/ui/textarea";

/**
 * Design system / Components: the catalog page (prompt stage 4). Every preview is the real
 * component from `@/components/ui` (prompt rule 5), small and closed (overlays show their
 * trigger), with seed-like data (D10). Rendered as a story so the accessibility test checks the
 * whole catalog in both themes. Links open the component's docs page in the top window.
 */
const meta = {
  title: "Design system/Components",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Entry = {
  name: string;
  /** Docs page id in this Storybook (`<title>--<mdx file name>`). */
  docsId: string;
  summary: string;
  preview: ReactNode;
};

type Group = { title: string; entries: Entry[] };

const docsHref = (id: string) => `./?path=/docs/${id}`;

const GROUPS: Group[] = [
  {
    title: "Actions",
    entries: [
      {
        name: "Button",
        docsId: "primitives-button--button",
        summary: "Starts an action on this screen; the red variant only for a purchase step.",
        preview: (
          <div className="flex flex-wrap gap-related">
            <Button variant="action">Add to cart</Button>
            <Button variant="outline">Update</Button>
          </div>
        ),
      },
      {
        name: "Text link",
        docsId: "primitives-text-link--textlink",
        summary: "Goes to another page; always underlined in running text.",
        preview: (
          <a href="#catalog" className={textLinkVariants({ variant: "standalone" })}>
            Back to products
          </a>
        ),
      },
    ],
  },
  {
    title: "Forms",
    entries: [
      {
        name: "Field",
        docsId: "primitives-field--field",
        summary: "Label, control, hint and error in a fixed order, linked for screen readers.",
        preview: (
          <Field>
            <FieldLabel htmlFor="catalog-postal">Postal code</FieldLabel>
            <Input
              id="catalog-postal"
              defaultValue="00950"
              aria-invalid="true"
              aria-describedby="catalog-postal-error"
            />
            <FieldError id="catalog-postal-error">Enter a postal code like 00-950.</FieldError>
          </Field>
        ),
      },
      {
        name: "Input",
        docsId: "primitives-input--input",
        summary: "One line of text: a name, an email, a quantity, a search.",
        preview: (
          <Field>
            <FieldLabel htmlFor="catalog-email">Email</FieldLabel>
            <Input id="catalog-email" type="email" defaultValue="ola@example.com" />
          </Field>
        ),
      },
      {
        name: "Textarea",
        docsId: "primitives-textarea--textarea",
        summary: "Several lines: a product description, a question to Copilot.",
        preview: (
          <Field>
            <FieldLabel htmlFor="catalog-question">Question</FieldLabel>
            <Textarea id="catalog-question" defaultValue="What should I focus on this week?" />
          </Field>
        ),
      },
      {
        name: "Label",
        docsId: "primitives-label--label",
        summary: "The visible name of a control; inside a form use it through Field.",
        preview: (
          <div className="flex flex-col gap-related">
            <Label htmlFor="catalog-sku">SKU</Label>
            <Input id="catalog-sku" className="font-mono" defaultValue="DEMO-MOUSE-VORTEX" />
          </div>
        ),
      },
      {
        name: "Select",
        docsId: "primitives-select--select",
        summary: "One choice from a short list, with the system picker on a phone.",
        preview: (
          <Field>
            <FieldLabel htmlFor="catalog-category">Category</FieldLabel>
            <NativeSelect id="catalog-category" defaultValue="mice">
              <NativeSelectOption value="">No category</NativeSelectOption>
              <NativeSelectOption value="mice">Mice</NativeSelectOption>
              <NativeSelectOption value="keyboards">Keyboards</NativeSelectOption>
            </NativeSelect>
          </Field>
        ),
      },
      {
        name: "Checkbox",
        docsId: "primitives-checkbox--checkbox",
        summary: "An on/off choice saved with the form, always with a visible label.",
        preview: (
          <Field orientation="horizontal">
            <Checkbox
              id="catalog-featured"
              defaultChecked
              aria-describedby="catalog-featured-hint"
            />
            <FieldContent>
              <FieldLabel htmlFor="catalog-featured">Featured on home page</FieldLabel>
              <FieldDescription id="catalog-featured-hint">
                Saved with the product form.
              </FieldDescription>
            </FieldContent>
          </Field>
        ),
      },
      {
        name: "Radio group",
        docsId: "primitives-radio-group--radiogroup",
        summary: "One choice from two to five options that are all visible.",
        preview: (
          <RadioGroup aria-label="Period" defaultValue="30" name="catalog-period">
            {[
              ["7", "Last 7 days"],
              ["30", "Last 30 days"],
            ].map(([value, label]) => (
              <Field key={value} orientation="horizontal">
                <RadioGroupItem id={`catalog-period-${value}`} value={value} />
                <FieldLabel htmlFor={`catalog-period-${value}`}>{label}</FieldLabel>
              </Field>
            ))}
          </RadioGroup>
        ),
      },
    ],
  },
  {
    title: "Status and feedback",
    entries: [
      {
        name: "Badge",
        docsId: "primitives-badge--badge",
        summary: "A status in words: order status, availability, demo data.",
        preview: (
          <div className="flex flex-wrap gap-related">
            <Badge variant="success">Paid</Badge>
            <Badge variant="warning">Pending payment</Badge>
            <Badge variant="demo">DEMO</Badge>
          </div>
        ),
      },
      {
        name: "Alert",
        docsId: "primitives-alert--alert",
        summary: "A message about a page or a form: info, success, warning, error or demo.",
        preview: (
          <Alert variant="demo">
            <AlertDescription>
              Demo store. Products and prices are fictional; no real orders or payments.
            </AlertDescription>
          </Alert>
        ),
      },
      {
        name: "Skeleton",
        docsId: "primitives-skeleton--skeleton",
        summary: "The shape of content that is loading, announced once by its group.",
        preview: (
          <SkeletonGroup label="Loading products…" className="flex flex-col gap-related">
            <Skeleton className="h-lh w-3/4" />
            <Skeleton className="h-lh w-1/2" />
            <Skeleton className="h-control-md w-32" />
          </SkeletonGroup>
        ),
      },
      {
        name: "Empty state",
        docsId: "primitives-empty-state--emptystate",
        summary: "Why a place is empty and the next step.",
        preview: (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Your cart is empty.</EmptyTitle>
              <EmptyDescription>Browse the catalog to add a product.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ),
      },
      {
        name: "Error state",
        docsId: "primitives-error-state--errorstate",
        summary: "A page or section that failed to load: what happened and what to do.",
        preview: (
          <ErrorState
            title="The catalog is temporarily unavailable"
            description="Please try again later."
          />
        ),
      },
    ],
  },
  {
    title: "Content and layout",
    entries: [
      {
        name: "Card",
        docsId: "primitives-card--card",
        summary: "A panel that groups one topic: a metric, the cart summary, a sign-in form.",
        preview: (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
              <CardDescription>Prices are confirmed at checkout.</CardDescription>
            </CardHeader>
          </Card>
        ),
      },
      {
        name: "Table",
        docsId: "primitives-table--table",
        summary: "Rows of records to scan and compare; numbers to the right.",
        preview: (
          <Table>
            <TableCaption className="sr-only">Low stock</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Product</TableHead>
                <TableHead scope="col" className="text-right">
                  Stock
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Titan MMO Mouse</TableCell>
                <TableCell className="text-right">3</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ),
      },
      {
        name: "Disclosure",
        docsId: "primitives-disclosure--disclosure",
        summary: "Extra content behind a summary line; works without JavaScript.",
        preview: (
          <Disclosure>
            <DisclosureTrigger>How these numbers are defined</DisclosureTrigger>
            <DisclosureContent>Revenue counts paid orders only.</DisclosureContent>
          </Disclosure>
        ),
      },
    ],
  },
  {
    title: "Navigation",
    entries: [
      {
        name: "Tabs",
        docsId: "primitives-tabs--tabs",
        summary: "Panels on the same page, or views by URL as a nav; one look for both.",
        preview: (
          <Tabs defaultValue="description">
            <TabsList aria-label="Product details">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="specification">Specification</TabsTrigger>
            </TabsList>
          </Tabs>
        ),
      },
      {
        name: "Navigation menu",
        docsId: "primitives-navigation-menu--navigationmenu",
        summary: "The store's category megamenu from 768 px; the trigger is a link.",
        preview: (
          <NavigationMenu aria-label="Catalog preview">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger href="/products">Shop</NavigationMenuTrigger>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        ),
      },
    ],
  },
  {
    title: "Overlays",
    entries: [
      {
        name: "Dialog",
        docsId: "primitives-dialog--dialog",
        summary: "A short task on top of the page that the user can leave at any time.",
        preview: (
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Rename category</DialogTrigger>
          </Dialog>
        ),
      },
      {
        name: "Alert dialog",
        docsId: "primitives-alert-dialog--alertdialog",
        summary: "Confirms an action that cannot be undone, with the object's name.",
        preview: (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Delete category
            </AlertDialogTrigger>
          </AlertDialog>
        ),
      },
    ],
  },
];

function CatalogTile({ entry }: { entry: Entry }) {
  return (
    <li className="flex">
      <Card size="sm" className="w-full">
        <CardHeader>
          <CardTitle>
            <h3>{entry.name}</h3>
          </CardTitle>
          <CardDescription>{entry.summary}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-group-item">
          <div>{entry.preview}</div>
          <a
            href={docsHref(entry.docsId)}
            target="_top"
            className={textLinkVariants({ variant: "standalone" })}
          >
            {entry.name} documentation
          </a>
        </CardContent>
      </Card>
    </li>
  );
}

function ComponentCatalog() {
  return (
    <div id="catalog" className="flex flex-col gap-section p-gutter">
      {GROUPS.map((group) => (
        <section key={group.title} aria-labelledby={`group-${group.title}`}>
          <h2 id={`group-${group.title}`} className="mb-group-item type-h2">
            {group.title}
          </h2>
          <ul className="grid gap-group-item md:grid-cols-2 xl:grid-cols-3">
            {group.entries.map((entry) => (
              <CatalogTile key={entry.name} entry={entry} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Every component of the system: 21 tiles in 6 groups, each with a link to its page. */
export const Catalog: Story = {
  render: () => <ComponentCatalog />,
  play: async ({ canvas }) => {
    const links = canvas.getAllByRole("link", { name: / documentation$/ });
    await expect(links).toHaveLength(GROUPS.flatMap((group) => group.entries).length);
    for (const link of links) {
      await expect(link.getAttribute("href")).toMatch(/^\.\/\?path=\/docs\/primitives-/);
    }
  },
};
