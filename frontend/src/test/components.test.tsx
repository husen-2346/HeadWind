import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Button,
  Input,
  SegmentedControl,
  RiskShape,
  RiskBadge,
} from "@/components/ui";

describe("Design System UI Components", () => {
  describe("Button", () => {
    it("renders label and handles click", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Calculate</Button>);

      const button = screen.getByRole("button", { name: "Calculate" });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("disables button when loading or disabled", () => {
      const { rerender } = render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();

      rerender(<Button loading>Loading</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("Input", () => {
    it("renders label, monoSuffix and handles input change", () => {
      const handleChange = vi.fn();
      render(
        <Input
          label="Cargo Weight"
          monoSuffix="lb"
          placeholder="42,000"
          onChange={handleChange}
        />
      );

      expect(screen.getByText("Cargo Weight")).toBeInTheDocument();
      expect(screen.getByText("lb")).toBeInTheDocument();

      const input = screen.getByPlaceholderText("42,000");
      fireEvent.change(input, { target: { value: "35,000" } });
      expect(handleChange).toHaveBeenCalled();
    });

    it("displays error message and marks aria-invalid", () => {
      render(<Input label="Origin" error="Invalid location" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid location");
    });
  });

  describe("SegmentedControl", () => {
    it("renders options with correct selection and handles click", () => {
      const handleChange = vi.fn();
      render(
        <SegmentedControl
          name="interval"
          value={25}
          onChange={handleChange}
          options={[
            { value: 10, label: "10 mi" },
            { value: 25, label: "25 mi" },
            { value: 50, label: "50 mi" },
          ]}
        />
      );

      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(3);
      expect(radios[1]).toHaveAttribute("aria-checked", "true");

      fireEvent.click(radios[2]);
      expect(handleChange).toHaveBeenCalledWith(50);
    });

    it("supports keyboard navigation with arrow keys", () => {
      const handleChange = vi.fn();
      render(
        <SegmentedControl
          name="interval"
          value={10}
          onChange={handleChange}
          options={[
            { value: 10, label: "10 mi" },
            { value: 25, label: "25 mi" },
            { value: 50, label: "50 mi" },
          ]}
        />
      );

      const radios = screen.getAllByRole("radio");
      fireEvent.keyDown(radios[0], { key: "ArrowRight" });
      expect(handleChange).toHaveBeenCalledWith(25);
    });
  });

  describe("RiskShape and RiskBadge", () => {
    it("renders appropriate SVG shape per level", () => {
      const { container } = render(<RiskShape level="low" size="md" />);
      expect(container.querySelector("circle")).toBeInTheDocument();
    });

    it("renders RiskBadge with label and shape", () => {
      render(<RiskBadge level="high" />);
      expect(screen.getByText("High Risk")).toBeInTheDocument();
    });

    it("shows load escalation indicator when escalated is true", () => {
      render(<RiskBadge level="severe" escalated />);
      expect(screen.getByText("Severe")).toBeInTheDocument();
      expect(screen.getByText("▲ load")).toBeInTheDocument();
    });
  });
});
