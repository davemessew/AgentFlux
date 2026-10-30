import { useState } from "react";
import type { Agent } from "../../../shared/domain";
import { Button, Field } from "../../components/ui";
import { errorMessage, post } from "../../lib/api";

export function AgentQuestions({
  agent,
  done,
}: {
  agent: Agent;
  done: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="agent-questions"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          await post(`/agents/${agent.id}/answers`, { answers });
          done();
        } catch (cause) {
          setError(errorMessage(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>A quick clarification</h3>
      {agent.pendingQuestions?.map((item) => (
        <Field key={item.id} label={item.question}>
          <textarea
            required
            maxLength={4000}
            rows={2}
            value={answers[item.id] || ""}
            onChange={(event) =>
              setAnswers({ ...answers, [item.id]: event.target.value })
            }
          />
        </Field>
      ))}
      {error && <p role="alert">{error}</p>}
      <Button disabled={busy} variant="primary">
        {busy ? "Continuing…" : "Answer and continue"}
      </Button>
    </form>
  );
}
