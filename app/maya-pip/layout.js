export const metadata = {
  title: 'Maya Assistant - Talio HRMS',
  description: 'Maya AI Assistant PIP Window',
}

export default function MayaPIPLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          body {
            margin: 0;
            padding: 0;
            background: transparent;
            overflow: hidden;
            -webkit-app-region: drag;
          }
          * {
            -webkit-user-select: none;
            user-select: none;
          }
          input, textarea {
            -webkit-user-select: text;
            user-select: text;
            -webkit-app-region: no-drag;
          }
          button {
            -webkit-app-region: no-drag;
          }
        `}</style>
      </head>
      <body className="bg-transparent">
        <div className="w-screen h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}

