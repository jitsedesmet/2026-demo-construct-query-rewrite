Context
This project is a copy of an earlier demo and will serve as the starting point for a new one focused on query rewriting via user-defined mappings. The parser/engine configuration UI of the original demo is no longer relevant and needs to be replaced.
New flow

The user writes a SPARQL query in the query editor.
The user defines one or more mappings — SPARQL CONSTRUCT queries — in dedicated tabs.
On execution, the user's query is rewritten using the mappings. The rewriter is the identity function for now; real rewriting will come later.
The rewritten query is shown in a read-only editor and then executed.
Its results are displayed in the results panel.

Required UI changes
Top-left panel — Mappings (replaces the current lexer / parser / generator / toAlgebra / toAst tabs)

Each tab holds one SPARQL CONSTRUCT mapping, edited in a YASGE editor.
Each tab has a user-editable label/name (e.g. click-to-rename) and is closable via a small "×" control on the tab itself.
A "+" button to the right of the tab selector creates a new mapping tab.
On initial page load, the panel contains a single default mapping, labeled accordingly:

sparql  CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }

Closing the last mapping tab removes it and then automatically re-adds the default CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o } mapping, so the panel is never empty.

Bottom-left panel — Rewritten query (replaces the current config-default.json view)

Replace the tab group with a single, read-only YASGE editor.
Displays the rewritten version of the user's query, populated on execution.

Top-right panel — Query editor (mostly unchanged)

On execute: pass the query through the rewriter (identity for now), show the result in the bottom-left editor, and execute the rewritten query.
Extend the existing "Load example…" dropdown so that selecting an example populates both the query editor and the mappings panel with the example's query and its associated set of mappings.
Overwrite protection: if the current mappings have diverged from the default (or from the most recently loaded example), loading an example must first display a polished confirmation modal warning the user that their current mappings will be replaced. If mappings are unchanged from the default/loaded state, the example loads without prompting.
A set of meaningful example queries (with accompanying mappings) should be defined as part of this task.

Bottom-right panel — Results (unchanged)

Displays results of the rewritten query, same as before.
