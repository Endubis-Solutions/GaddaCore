"use client";

import React, { useState } from "react";
import { JsonViewer } from '@textea/json-viewer';
import {
  MoonIcon,
  SunIcon,
  EyeIcon,
  CodeIcon,
  XIcon,
} from "lucide-react";

interface FloatingDebugJsonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  title?: string;
  collapsed?: boolean | number;
  editable?: boolean;
  hideInProduction?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

const FloatingDebugJson: React.FC<FloatingDebugJsonProps> = ({
  data,
  title = "Debug Data",
  collapsed = true,
  editable = false,
  hideInProduction = true,
  position = "bottom-right",
}) => {
  const [isDark, setIsDark] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Hide in production if enabled
  if (hideInProduction && process.env.NODE_ENV === "production") {
    return null;
  }

  const toggleDark = () => setIsDark(!isDark);
  const toggleOpen = () => setIsOpen(!isOpen);

  // Compute floating panel classes based on position
  const getButtonPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "top-right":
        return "top-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      case "bottom-right":
      default:
        return "bottom-4 right-4";
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={toggleOpen}
        className={`fixed z-50 flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-amberbg-amber-600-foreground shadow-lg transition-all hover:bg-amber-600/90 focus:outline-none focus:ring-2 focus:ring-amberbg-amber-600 focus:ring-offset-2 ${
          getButtonPositionClasses()
        }`}
        aria-label={isOpen ? "Close debug panel" : "Open debug panel"}
      >
        {isOpen ? <XIcon className="h-5 w-5" /> : <CodeIcon className="h-5 w-5" />}
      </button>

      {/* Floating Debug Panel */}
      {isOpen && (
        <div
          className={`fixed z-40 max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border bg-background shadow-xl transition-all duration-300 ease-in-out md:w-96 ${
            getButtonPositionClasses()
          } transform ${
            position.startsWith("bottom")
              ? "translate-y-0 opacity-100"
              : "-translate-y-0 opacity-100"
          }`}
          style={{
            // Prevent panel from going off-screen in top positions
            ...(position.startsWith("top") && { top: "4rem" }),
            ...(position.startsWith("bottom") && { bottom: "4rem" }),
            ...(position.endsWith("left") && { left: "1rem" }),
            ...(position.endsWith("right") && { right: "1rem" }),
          }}
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <EyeIcon className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">{title}</h4>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleDark}
                  className="rounded p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  title={isDark ? "Light mode" : "Dark mode"}
                >
                  {isDark ? (
                    <SunIcon className="h-4 w-4" />
                  ) : (
                    <MoonIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  aria-label="Close"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* JSON Viewer */}
            <div className="flex-1 overflow-auto p-4">
              <JsonViewer
                value={data}
                theme={isDark ? "dark" : "light"}
                defaultInspectDepth={typeof collapsed === "number" ? collapsed : (collapsed ? 1 : Infinity)}
                rootName={false}
                displayDataTypes={false}
                enableClipboard={true}
                collapseStringsAfterLength={80}
                style={{
                  fontSize: "0.875rem",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  backgroundColor: isDark ? "#1e1e1e" : "#fafafa",
                  minHeight: "200px",
                }}
                // Additional JsonViewer props for better UX
                highlightUpdates={false}
                editable={editable}
                className="json-viewer-container"
              />
            </div>

            {/* Footer */}
            <div className="border-t bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Inspectable JSON</span>
                <div className="flex items-center gap-1">
                  <CodeIcon className="h-3.5 w-3.5" />
                  <span>Click to copy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom styles for JsonViewer */}
      <style jsx global>{`
        .json-viewer-container {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        }
        
        /* Ensure proper theming */
        .json-viewer-container[data-theme="dark"] {
          background-color: #1e1e1e !important;
          color: #d4d4d4 !important;
        }
        
        .json-viewer-container[data-theme="light"] {
          background-color: #fafafa !important;
          color: #24292e !important;
        }
      `}</style>
    </>
  );
};

export default FloatingDebugJson;