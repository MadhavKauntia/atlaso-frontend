import Link from "next/link";

/**
 * The atlaso wordmark logo. `dark` renders a white version (via filter) for
 * dark backgrounds. Pass `href={null}` to render just the image (no link).
 */
export default function Brand({
  dark = false,
  height = 26,
  href = "/" as string | null,
  style,
}: {
  dark?: boolean;
  height?: number;
  href?: string | null;
  style?: React.CSSProperties;
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dark ? "/assets/logo-white.png" : "/assets/logo-black.png"}
      alt="Atlaso"
      style={{
        height,
        width: "auto",
        display: "block",
        ...style,
      }}
    />
  );
  return href ? (
    <Link href={href} aria-label="Atlaso home" style={{ display: "inline-flex", alignItems: "center" }}>
      {img}
    </Link>
  ) : (
    img
  );
}
