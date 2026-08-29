# Product

## Register

product

## Users

A solo maker running a home-based 3D figure printing business. They manage a catalog of figure designs, physical filament spools, and an active production queue across desktop planning sessions and quick mobile checks beside the printer. Their core job is to choose the next spool efficiently and confirm that every queued figure needing that color has been printed before unloading it.

## Product Purpose

3D Print Flow is a local-first, color-first production tracker. It ranks filament colors by outstanding queue demand, shows every figure that needs the loaded spool, and records per-color completion with a single reversible tap. Success means fewer spool swaps, no missed parts, and complete confidence in the live queue without accounts, cloud storage, or manual cross-checking.

## Brand Personality

Useful, warm, and colorful. The product should feel like a well-organized craft bench: practical, calm, tactile, and quietly satisfying. It communicates mastery through clarity while letting each user's filament palette provide the visual character.

## Anti-references

- Generic SaaS dashboards with decorative metrics or excessive chrome
- Neon-on-black developer-tool aesthetics
- Cold, clinical enterprise software
- Glassmorphism, gradient text, and decorative visual noise
- Interfaces that rely on color alone or make progress state ambiguous
- Long or theatrical animations that interrupt rapid production work

## Design Principles

1. **Colors are the content.** User-defined filament colors are the visual focus; the surrounding interface stays neutral and supportive.
2. **Progress must be unmistakable.** Every toggle produces immediate, redundant feedback so state is clear without relying on hue, saturation, or memory.
3. **Utility comes first.** Each element supports planning, printing, or recovery; reversible actions stay fast and destructive actions explain their impact.
4. **Build trust through visible behavior.** Rankings, counts, progress, and persistence stay synchronized and predictable.
5. **Support the workshop context.** Dense desktop planning and one-handed mobile use share the same mental model, with comfortable touch targets and readable hierarchy.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Keep text and interactive-state contrast compliant in light and dark themes, never communicate state by color alone, preserve visible keyboard focus, and use semantic control states and labels. Interactive targets should be at least 44px where practical. Motion must respect `prefers-reduced-motion`, and dynamic spool colors must remain identifiable by name and state regardless of lightness, saturation, or color-vision differences.
