import type { Ref } from "react";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { inicjaly, pelneImie } from "@/lib/prowadzacy";
import type { Prowadzacy } from "@/lib/types";

/** `ref` is forwarded so the card can be a direct child of <AnimatePresence mode="popLayout">. */
export function ProwadzacyCard({ prowadzacy: p, ref }: { prowadzacy: Prowadzacy; ref?: Ref<HTMLElement> }) {
  return (
    <AnimatedItem ref={ref} className="instructor-card" aria-label={pelneImie(p)}>
      <div className="instructor-top">
        <Avatar initials={inicjaly(p)} src={p.zdjecieUrl} />
        <div>
          <div className="instructor-name">{pelneImie(p)}</div>
          {p.instytut && <div className="instructor-role">{p.instytut}</div>}
        </div>
      </div>
      <div className="instructor-meta">
        <a href={`mailto:${p.email}`}>{p.email}</a>
      </div>
      {p.przedmioty.length > 0 && (
        <div className="tag-row">
          {p.przedmioty.map((przedmiot) => (
            <Tag key={przedmiot}>{przedmiot}</Tag>
          ))}
        </div>
      )}
      <div className="card-actions">
        <ButtonLink href={`/harmonogram-prowadzacych?prowadzacy=${p.id}`}>Zobacz harmonogram</ButtonLink>
      </div>
    </AnimatedItem>
  );
}
