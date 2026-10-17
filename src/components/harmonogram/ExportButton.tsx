import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** "Eksportuj do Excela" — disabled until the backend export exists. */
export function ExportButton() {
  // TODO(backend): export the timetable shown (group or instructor, selected week) to .xlsx.
  return (
    <Button variant="secondary" disabled title="Eksport będzie dostępny po podłączeniu backendu">
      <Icon name="table" />
      Eksportuj do Excela
    </Button>
  );
}
