type AuthHeadingProps = {
  title: string;
  description?: string;
};

export default function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <header className="auth-heading">
      <h1 className="text-2xl font-black text-slate-950">{title}</h1>
      {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
    </header>
  );
}
