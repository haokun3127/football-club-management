import { DatePicker, Form, Input, InputNumber, Select, Switch } from "antd";
import type { Field, Option } from "../services/resource-fields";
import { groupResourceFields } from "../services/resource-presentation";

export default function ResourceFields({
  resource,
  fields,
  choices,
  eventType,
  hasDetail,
}: {
  resource: string;
  fields: Field[];
  choices: Record<string, Option[]>;
  eventType?: string;
  hasDetail: boolean;
}) {
  const visible = fields.filter(
    (f) =>
      (!f.appliesTo || f.appliesTo === eventType) &&
      (!f.virtual || f.key !== "balanceAfter" || hasDetail),
  );
  return (
    <>
      {groupResourceFields(resource, visible).map((group) => (
        <fieldset className="resource-fieldset" key={group.title}>
          <legend>{group.title}</legend>
          <div className="resource-field-grid">
            {group.fields.map((f) => (
              <Form.Item
                key={f.key}
                className={
                  f.kind === "textarea" || f.kind === "tags" || f.multiple
                    ? "resource-field-wide"
                    : undefined
                }
                name={f.key}
                label={f.label}
                valuePropName={f.kind === "boolean" ? "checked" : "value"}
                rules={
                  f.required
                    ? [
                        {
                          required: true,
                          message: `请填写${f.label}`,
                        },
                      ]
                    : []
                }
              >
                {f.kind === "date" || f.kind === "datetime" ? (
                  <DatePicker
                    showTime={f.kind === "datetime"}
                    className="full-width"
                  />
                ) : f.kind === "number" ? (
                  <InputNumber
                    min={f.minimum}
                    max={f.maximum}
                    className="full-width"
                  />
                ) : f.kind === "boolean" ? (
                  <Switch />
                ) : f.kind === "textarea" ? (
                  <Input.TextArea rows={4} maxLength={5000} />
                ) : f.kind === "reference" || f.options || f.kind === "tags" ? (
                  <Select
                    allowClear={!f.required}
                    showSearch
                    optionFilterProp="label"
                    mode={
                      f.kind === "tags"
                        ? f.options
                          ? "multiple"
                          : "tags"
                        : f.multiple
                          ? "multiple"
                          : undefined
                    }
                    options={
                      f.options ?? (f.reference ? choices[f.reference] : [])
                    }
                  />
                ) : (
                  <Input maxLength={500} />
                )}
              </Form.Item>
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}
