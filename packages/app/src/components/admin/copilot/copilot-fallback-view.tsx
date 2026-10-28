import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TextLink } from "@/components/ui/text-link";
import { SIGN_IN_HREF, SIGN_IN_TEXT } from "./copilot-copy";
import type { AnswerNotice, FailureNotice } from "./copilot-fallback";

/**
 * A notice above an answer (S1 to S10 in the state map). No role: the answer region is already
 * `aria-live="polite"`, so the notice is announced once with the answer.
 */
export function AnswerNoticeView({ notice }: { notice: AnswerNotice }) {
  return (
    <Alert variant={notice.variant}>
      {notice.title ? <AlertTitle>{notice.title}</AlertTitle> : null}
      <AlertDescription>
        <p data-testid={notice.testId}>{notice.description}</p>
      </AlertDescription>
    </Alert>
  );
}

/**
 * A failed question (S11 to S13): a warning with `role="alert"`, because the owner must act on it
 * (retry, or sign in again). The session notice links to the sign-in page; it carries no token.
 */
export function FailureNoticeView({ notice }: { notice: FailureNotice }) {
  return (
    <Alert variant="warning" role="alert">
      <AlertDescription>
        <p>{notice.message}</p>
        {notice.signIn ? <TextLink href={SIGN_IN_HREF}>{SIGN_IN_TEXT}</TextLink> : null}
      </AlertDescription>
    </Alert>
  );
}
