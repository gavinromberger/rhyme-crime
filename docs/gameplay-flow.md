# Gameplay Flow

```mermaid
flowchart TD
    A([Heist List]) --> B[Heist Briefing\nSelect crew + passive operator\nView max guesses]
    B --> C[BEGIN HEIST]
    C --> D[GameplayScreen loads\ngetOrAssignRhymes\nTimer starts]

    D --> E{Handler\nselected?}
    E -- Yes --> F[Timer always visible]
    E -- No --> G[Timer flashes at :45/:30/:15/:00\nand final :03/:02/:01]

    F & G --> H[Active lock presented\nRiddle + syllable count shown]

    H --> I[Player types on custom keyboard\nadjective + space + noun]
    I --> J[CRACK IT]

    J --> K{Correct\nanswer?}

    K -- Yes --> L{More locks\nremaining?}
    L -- Yes --> M[Lock collapses green\nNext lock expands]
    M --> H

    K -- No --> N[Wrong guess logged\nRandom crew member busted]
    N --> O{All crew\nunavailable?}
    O -- No --> H
    O -- Yes --> FAIL_G[FAIL\nfailureReason: guesses\nAll guesses exhausted. The lock held.]

    L -- No\nAll locks cracked --> P{Courier\nselected?}

    P -- Yes --> SUCCESS

    P -- No --> Q[Egress riddle appears\n1 word pre-revealed\n60s countdown]
    Q --> R[Player types rhyming word\nSingle word, no space]
    R --> S{Correct?}
    S -- Yes --> SUCCESS
    S -- No\nor timer hits 0 --> FAIL_E[FAIL\nfailureReason: egress\nFailed to solve the exit lock.\nCould not escape with the loot.]

    TIMER_EXP[Main timer hits 0] --> FAIL_T[FAIL\nfailureReason: timer\nTime expired. The heist is blown.]
    ABORT[Abort button pressed] --> FAIL_A[FAIL\nfailureReason: abort\nYou called the abort. The crew pulled out.]

    D -.->|at any time| TIMER_EXP
    D -.->|at any time| ABORT

    SUCCESS([HEIST COMPLETE\nXP calculated\nPerformance rated\nmoodImprovements\ngrievanceChanges])
    FAIL_G & FAIL_T & FAIL_E & FAIL_A --> FAIL_COMMON

    FAIL_COMMON([HEIST FAILED\nclearRhymeAssignment\nCrew mood incidents +1 or +2\ngone_awol checks])

    SUCCESS --> RS[HeistResultScreen\n① Hero card — outcome + XP\n② Lock results multi-lock\n③ Debrief — wrong guesses + busts + returns\n④ Crew mood bars]
    FAIL_COMMON --> RS

    RS --> T{Success?}
    T -- Yes --> U([Back to Heists])
    T -- No --> V{Player choice}
    V -- RETRY --> B
    V -- BACK --> U

    subgraph Crew Abilities [Crew Abilities — each usable once per heist]
        CA1[🎩 Extractor\nHighlights first letters\nof both answer words in green]
        CA2[📚 Linguist\nReveals dictionary definition\nof one answer word]
        CA3[💎 Extortionist\nEliminates 3 wrong letters\nfrom keyboard in red]
        CA4[💃 Distractor\nFreezes main timer\n2–3 minutes random]
    end

    H -.->|player taps ability button| Crew Abilities
```
