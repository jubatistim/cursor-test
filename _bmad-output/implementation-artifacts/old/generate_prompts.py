import os

artifacts_dir = "/media/juliano-batistim/DATA-EMPIRE1/dev/cursor-test/_bmad-output/implementation-artifacts"
diff_file = os.path.join(artifacts_dir, "diff-group1.txt")
spec_file = os.path.join(artifacts_dir, "1-1-create-room.md")

with open(diff_file, "r") as f:
    diff_content = f.read()

with open(spec_file, "r") as f:
    spec_content = f.read()

# Blind Hunter
with open(os.path.join(artifacts_dir, "prompt-blind-hunter.md"), "w") as f:
    f.write("Run the `bmad-review-adversarial-general` skill on the following diff. Do not ask for more context, just review the diff:\n\n```diff\n")
    f.write(diff_content)
    f.write("\n```\n")

# Edge Case Hunter
with open(os.path.join(artifacts_dir, "prompt-edge-case-hunter.md"), "w") as f:
    f.write("Run the `bmad-review-edge-case-hunter` skill on the following diff. You have read access to the project.\n\n```diff\n")
    f.write(diff_content)
    f.write("\n```\n")

# Acceptance Auditor
with open(os.path.join(artifacts_dir, "prompt-acceptance-auditor.md"), "w") as f:
    f.write("""You are an Acceptance Auditor. Review this diff against the spec and context docs. Check for: violations of acceptance criteria, deviations from spec intent, missing implementation of specified behavior, contradictions between spec constraints and actual code. Output findings as a Markdown list. Each finding: one-line title, which AC/constraint it violates, and evidence from the diff.

### Spec File
""")
    f.write(spec_content)
    f.write("\n\n### Diff Output\n```diff\n")
    f.write(diff_content)
    f.write("\n```\n")
