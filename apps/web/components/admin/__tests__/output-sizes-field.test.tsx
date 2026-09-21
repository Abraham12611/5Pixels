import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productCreateSchema } from "@5pixels/shared";
import type { z } from "zod";
import { OutputSizesField } from "../output-sizes-field";

type FormValues = z.input<typeof productCreateSchema>;

// The real Radix popover relies on browser behaviors jsdom lacks
// (animationend for Presence unmount, pointer capture, real focus events),
// which leaves the layer mounted and floods the event loop for tens of
// seconds per test. Stub the primitives so the test exercises OUR
// selection logic only — rich-select.test.tsx uses the same stub.
vi.mock("radix-ui", async () => {
  const React = await import("react");
  const Ctx = React.createContext<{
    open: boolean;
    setOpen: (v: boolean) => void;
  }>({ open: false, setOpen: () => {} });

  const Root = ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange?: (v: boolean) => void;
    children: React.ReactNode;
  }) => (
    <Ctx.Provider value={{ open, setOpen: onOpenChange ?? (() => {}) }}>
      {children}
    </Ctx.Provider>
  );

  const Trigger = ({
    children,
  }: {
    children: React.ReactElement<Record<string, unknown>>;
  }) => {
    const { open, setOpen } = React.useContext(Ctx);
    return React.cloneElement(children, {
      onClick: () => setOpen(!open),
      "aria-expanded": open,
    });
  };

  const Portal = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );

  const Content = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => {
    const { open } = React.useContext(Ctx);
    return open ? <div className={className}>{children}</div> : null;
  };

  return { Popover: { Root, Trigger, Portal, Content } };
});

function Harness({
  onSubmit,
}: {
  onSubmit: (data: z.output<typeof productCreateSchema>) => void;
}) {
  const methods = useForm<
    FormValues,
    unknown,
    z.output<typeof productCreateSchema>
  >({
    resolver: zodResolver(productCreateSchema),
    defaultValues: {
      type: "filter",
      name: "Test Filter",
      slug: "test-filter",
      public_status: "draft",
      visibility: "public",
      credit_cost: 1,
      version: {
        version_number: 1,
        state: "draft",
        private_instruction_template: "Make it glow.",
        provider_strategy: {
          primary_provider: "fal.ai",
          primary_model: "flux-pro",
        },
        model_config: {},
        output_sizes: [],
        input_validation_config: {},
        post_process_config: {
          crop: false,
          format: "webp",
          quality: 90,
          metadata_stripped: true,
        },
        safety_config: {
          allowed_nsfw: false,
          block_public_figures: true,
          block_minors: true,
        },
        credit_cost: 1,
      },
      fields: [],
      filter_config: {
        style_archetype: "portrait",
        identity_preservation: "high",
      },
    },
  });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <OutputSizesField />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

describe("OutputSizesField", () => {
  it("selects multiple presets and marks the first as default", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Output sizes" }));
    fireEvent.click(screen.getByRole("option", { name: /Square \(1:1\)/ }));
    fireEvent.click(screen.getByRole("option", { name: /Portrait \(4:5\)/ }));

    expect(screen.getByText("2 sizes selected")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    expect(onSubmit).toHaveBeenCalled();
    const sizes = onSubmit.mock.calls[0][0].version.output_sizes;
    expect(sizes).toEqual([
      {
        name: "Square (1:1)",
        width: 1024,
        height: 1024,
        is_default: true,
        match_source: false,
        match_reference: false,
      },
      {
        name: "Portrait (4:5)",
        width: 1024,
        height: 1280,
        is_default: false,
        match_source: false,
        match_reference: false,
      },
    ]);
  });

  it("lets you reassign the default", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Output sizes" }));
    fireEvent.click(screen.getByRole("option", { name: /Square \(1:1\)/ }));
    fireEvent.click(screen.getByRole("option", { name: /Portrait \(4:5\)/ }));

    const radios = screen.getAllByRole("radio", { name: "Default" });
    fireEvent.click(radios[1]);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    expect(onSubmit).toHaveBeenCalled();
    const sizes = onSubmit.mock.calls[0][0].version.output_sizes;
    expect(sizes[0].is_default).toBe(false);
    expect(sizes[1].is_default).toBe(true);
  });
});
