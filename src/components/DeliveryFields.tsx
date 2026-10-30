import type { Delivery } from "../../shared/domain";
import { Field, Toggle } from "./ui";

export function DeliveryFields({
  value,
  onChange,
  defaultDirectory,
}: {
  value?: Delivery | null;
  onChange: (value: Delivery | null) => void;
  defaultDirectory: string;
}) {
  return (
    <>
      <Toggle
        label="Save reports to a folder"
        description="A completed run writes its results together. Failed deliveries remain visible in Runs."
        checked={!!value}
        onChange={(enabled) =>
          onChange(
            enabled
              ? { directory: defaultDirectory, formats: ["json", "md"] }
              : null,
          )
        }
      />
      {value && (
        <>
          <Field
            label="Output folder"
            hint="Use the outbox or a mounted folder listed in AGENTFLUX_OUTPUT_ROOTS."
          >
            <input
              required
              value={value.directory}
              onChange={(event) =>
                onChange({ ...value, directory: event.target.value })
              }
              placeholder={defaultDirectory}
            />
          </Field>
          <fieldset className="delivery-formats">
            <legend>Report formats</legend>
            {(["json", "csv", "md"] as const).map((format) => (
              <label key={format}>
                <input
                  type="checkbox"
                  checked={value.formats.includes(format)}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      formats: event.target.checked
                        ? [...value.formats, format]
                        : value.formats.filter((item) => item !== format),
                    })
                  }
                />
                {format === "md" ? "Markdown" : format.toUpperCase()}
              </label>
            ))}
          </fieldset>
        </>
      )}
    </>
  );
}
