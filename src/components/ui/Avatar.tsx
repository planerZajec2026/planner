type AvatarProps = {
  initials: string;
  src?: string;
  size?: number;
};

/** Round avatar: photo when available, otherwise initials. */
export function Avatar({ initials, src, size = 46 }: AvatarProps) {
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object URLs / Supabase Storage URLs
        <img src={src} alt="" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
