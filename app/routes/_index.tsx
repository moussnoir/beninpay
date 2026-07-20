import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "My Shopify App" },
    { name: "description", content: "Welcome to my Shopify app!" },
  ];
};

export default function Index() {
  return (
    <div style={{
      fontFamily: "system-ui, sans-serif",
      lineHeight: "1.8",
      padding: "2rem",
      maxWidth: "800px",
      margin: "0 auto"
    }}>
      <h1 style={{ color: "#5E8E3E", fontSize: "3rem" }}>
        🛍️ My Shopify App
      </h1>

      <p style={{ fontSize: "1.2rem", color: "#666" }}>
        Welcome to your new Shopify app built with Remix!
      </p>

      <div style={{
        marginTop: "2rem",
        padding: "1.5rem",
        background: "#f0f0f0",
        borderRadius: "8px"
      }}>
        <h2>✅ Setup Complete!</h2>
        <ul>
          <li>✓ Remix framework configured</li>
          <li>✓ TypeScript ready</li>
          <li>✓ Shopify API installed</li>
          <li>✓ Development server ready</li>
        </ul>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h3>🚀 Next Steps:</h3>
        <ol>
          <li>Run <code style={{
            background: "#333",
            color: "#0f0",
            padding: "2px 6px",
            borderRadius: "4px"
          }}>npm install</code> to install dependencies</li>
          <li>Run <code style={{
            background: "#333",
            color: "#0f0",
            padding: "2px 6px",
            borderRadius: "4px"
          }}>npm run dev</code> to start development server</li>
          <li>Open <a href="http://localhost:3000" style={{ color: "#5E8E3E" }}>
            http://localhost:3000
          </a></li>
        </ol>
      </div>

      <div style={{
        marginTop: "3rem",
        padding: "1rem",
        background: "#e8f5e9",
        borderRadius: "8px",
        borderLeft: "4px solid #5E8E3E"
      }}>
        <h4>📚 Resources:</h4>
        <ul>
          <li><a href="https://remix.run/docs" target="_blank" rel="noreferrer">
            Remix Documentation
          </a></li>
          <li><a href="https://shopify.dev/docs/api/admin" target="_blank" rel="noreferrer">
            Shopify Admin API
          </a></li>
          <li><a href="https://shopify.dev/docs/apps" target="_blank" rel="noreferrer">
            Shopify App Development
          </a></li>
        </ul>
      </div>
    </div>
  );
}
