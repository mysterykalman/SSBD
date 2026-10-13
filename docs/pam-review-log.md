# Pam review logging

Mom Mode now records a same-device diagnostic trace for each Pam game under `ssbd.mom.gamelog.v1`.

Open `/review` on the same browser to inspect Pam games alongside the existing Solo review tooling. Each Pam game records the locked answer, runtime concept/question counts, the ordered questions and answers, question-source diagnostics, information gain, known/semantic coverage, confidence, and the top candidates at each step. The Pam panel also supports JSON export.

The log is diagnostic only. It does not influence question ranking or gameplay and is capped to the 50 most recent Pam games on the device.
