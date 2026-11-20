import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Combobox, NumberInput, Tooltip, ErrorState } from "@/components/ui";

describe("Stage 0 UI Primitives", () => {
  describe("Combobox", () => {
    const sampleOptions = [
      { value: "dallas", label: "Dallas, TX", subLabel: "United States" },
      { value: "denver", label: "Denver, CO", subLabel: "United States" },
    ];

    it("renders with combobox ARIA roles", () => {
      render(
        <Combobox
          label="Origin"
          placeholder="Enter city"
          value=""
          onChange={() => {}}
          onSelectOption={() => {}}
          options={sampleOptions}
        />
      );

      const input = screen.getByRole("combobox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("aria-autocomplete", "list");
      expect(input).toHaveAttribute("aria-expanded", "false");
    });

    it("opens listbox on ArrowDown and selects with Enter", () => {
      const handleSelect = vi.fn();
      render(
        <Combobox
          value="Da"
          onChange={() => {}}
          onSelectOption={handleSelect}
          options={sampleOptions}
        />
      );

      const input = screen.getByRole("combobox");
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(input).toHaveAttribute("aria-expanded", "true");

      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeInTheDocument();

      fireEvent.keyDown(input, { key: "Enter" });
      expect(handleSelect).toHaveBeenCalledWith(sampleOptions[0]);
    });

    it("closes listbox on Escape", () => {
      render(
        <Combobox
          value="Da"
          onChange={() => {}}
          onSelectOption={() => {}}
          options={sampleOptions}
        />
      );

      const input = screen.getByRole("combobox");
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.keyDown(input, { key: "Escape" });
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("NumberInput", () => {
    it("formats with commas and renders unit suffix", () => {
      render(
        <NumberInput
          label="Weight"
          value={42000}
          onChange={() => {}}
          monoSuffix="lb"
        />
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("42,000");
      expect(screen.getByText("lb")).toBeInTheDocument();
    });

    it("parses numeric change without commas", () => {
      const handleChange = vi.fn();
      render(<NumberInput value={42000} onChange={handleChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "35000" } });
      expect(handleChange).toHaveBeenCalledWith(35000);
    });
  });

  describe("Tooltip", () => {
    it("shows on focus and hides on Escape", () => {
      render(
        <Tooltip content="Tooltip message">
          <button type="button">Trigger</button>
        </Tooltip>
      );

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      const triggerWrapper = screen.getByText("Trigger").parentElement!;
      fireEvent.focus(triggerWrapper);

      expect(screen.getByRole("tooltip")).toHaveTextContent("Tooltip message");

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  describe("ErrorState", () => {
    it("renders title, message, and triggers retry", () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          title="Custom Error"
          message="Detailed reason"
          onRetry={handleRetry}
        />
      );

      expect(screen.getByText("Custom Error")).toBeInTheDocument();
      expect(screen.getByText("Detailed reason")).toBeInTheDocument();

      const button = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(button);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });
});
