import Link from "next/link";
import type { ComponentProps } from "react";
import { PRZEJSCIE } from "@/lib/motion";

/** In-app link that marks the navigation as a page change, so the new page animates in (spec 07). */
export function AppLink(props: ComponentProps<typeof Link>) {
  return <Link transitionTypes={[PRZEJSCIE.strona]} {...props} />;
}
