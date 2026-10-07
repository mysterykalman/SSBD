// @ts-check
// Shared JSDoc types for the game. This module has no runtime code; import
// the types with `@typedef {import("./types.js").Name} Name`.

/** @typedef {"en" | "fr"} Language */

/** Side "a" is slot 1 (the player in Solo, the creator in family games); "b" is slot 2. */
/** @typedef {"a" | "b"} Side */

/**
 * OPEN: waiting for both words. REVEALED: both words shown, they differ.
 * MATCHED: both words the same (game ends). EXHAUSTED: move 20 revealed without a match.
 * @typedef {"OPEN" | "REVEALED" | "MATCHED" | "EXHAUSTED"} MoveStatus
 */

/** @typedef {"ACTIVE" | "MATCHED" | "EXHAUSTED"} GameStatus */

/** Game status as the API reports it; WAITING is a family game with one player. */
/** @typedef {GameStatus | "WAITING"} ViewStatus */

/**
 * Word validation and duplicate codes. TOO_SHORT is retired (one-letter words are
 * allowed) and is no longer returned.
 * @typedef {"EMPTY" | "TOO_LONG" | "INVALID_CHARACTERS" | "TOO_SHORT" | "TOO_MANY_WORDS" | "SAME_AS_LAST" | "ALREADY_USED" | "GAME_OVER"} WordErrorCode
 */

/**
 * @typedef {{ok: true, word: string, key: string}} WordOk
 * @typedef {{ok: false, code: WordErrorCode, word?: string}} WordError
 * @typedef {WordOk | WordError} WordCheck
 */

/** Both sides' words for one move, as typed (friendly form). */
/** @typedef {{a: string, b: string}} Reveal */

/** The Solo bot's word, locked when the move opens and before the player types. */
/** @typedef {{b: string, quality: BotQuality}} HiddenWord */

/** @typedef {"opening" | "strong" | "loose"} BotQuality */

/** @typedef {{word: string, quality: BotQuality}} BotPick */

/**
 * One move of a rules-style game.
 * @typedef {object} Move
 * @property {number} number 1-based and contiguous
 * @property {[string, string] | null} prompts the previous move's reveal, null on move 1
 * @property {Reveal | null} words null while OPEN
 * @property {MoveStatus} status
 * @property {string} openedAt ISO time
 * @property {string | null} revealedAt ISO time
 * @property {HiddenWord} [hidden] Solo only, open move only: the bot's locked word
 * @property {BotQuality | null} [botQuality] Solo/legacy only, after reveal
 */

/**
 * A game as the shared rules see it (Solo state on the device).
 * @typedef {object} GameState
 * @property {number} schema
 * @property {string} id
 * @property {"solo" | "family"} mode
 * @property {Language} language
 * @property {number} seed
 * @property {GameStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {number} revealSeen
 * @property {Move[]} moves
 */

/** The minimum the rules need from a game (the server builds this from D1 rows). */
/** @typedef {{status: GameStatus, moves: Array<Pick<Move, "words">>}} RulesGame */

/**
 * A stored family-game submission (one row of `submissions`).
 * @typedef {object} Submission
 * @property {string} round_id
 * @property {string} player_id
 * @property {string} word
 * @property {string} submitted_at
 */

/**
 * One move in the API view. Before reveal only the viewer's own word (`mine`)
 * and whether the other side has locked in (`otherLocked`) are sent.
 * @typedef {object} ViewMove
 * @property {number} number
 * @property {[string, string] | null} prompts
 * @property {MoveStatus} status
 * @property {string} openedAt
 * @property {string | null} revealedAt
 * @property {Reveal | null} words
 * @property {BotQuality | null} botQuality
 * @property {string | null} mine
 * @property {boolean} otherLocked
 */

/**
 * A family game (or a legacy D1 Solo game) as one player may see it: `GET /api/game`.
 * @typedef {object} GameView
 * @property {"family" | "legacy-solo"} kind
 * @property {string} id
 * @property {string} joinCode
 * @property {Language} language
 * @property {ViewStatus} status
 * @property {boolean} waitingForPlayer
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {number} maxMoves
 * @property {{side: Side | undefined, name: string | null}} you
 * @property {{side: Side, bot: boolean, name: string | null, joined: boolean}} opponent
 * @property {string | null} rematchId the rematch game started from this one, if any
 * @property {ViewMove[]} moves
 */

/**
 * One revealed move in a history list (Solo or family).
 * @typedef {object} HistoryEntry
 * @property {number} number
 * @property {[string, string] | null} prompts
 * @property {Reveal} words
 * @property {MoveStatus} status
 * @property {string | null} revealedAt
 */

/** @typedef {"YOUR_TURN" | "READY_TO_REVEAL" | "PLAYER_JOINED" | "GAME_COMPLETE" | "GAME_EXHAUSTED" | "REMATCH"} NotificationKind */

/**
 * `GET /api/notifications` item. Ids are deterministic (`${gameId}:${key}:${playerId}`).
 * @typedef {object} Notification
 * @property {string} id
 * @property {NotificationKind} kind
 * @property {string} game_id
 * @property {string} created_at
 * @property {string | null} read_at
 * @property {string | null} opponent_name
 */

/**
 * Device-local storage under localStorage key "ssbd.store" (see src/client/store.js).
 * @typedef {object} SoloStoreRecord
 * @property {number} schema
 * @property {Record<string, GameState>} solo Solo games by id
 * @property {Record<string, number>} seen last reveal number the player has seen, by game id
 * @property {{kind: "solo" | "family", id: string, at?: string} | null} last the game to reopen
 */

/**
 * The subset of the Cloudflare D1 API the server uses.
 * @typedef {object} D1Result
 * @property {any[]} [results]
 * @property {{changes?: number}} [meta]
 * @typedef {object} D1PreparedStatement
 * @property {(...args: unknown[]) => D1PreparedStatement} bind
 * @property {() => Promise<D1Result>} all
 * @property {() => Promise<D1Result>} run
 * @typedef {object} D1Database
 * @property {(sql: string) => D1PreparedStatement} prepare
 * @property {(statements: D1PreparedStatement[]) => Promise<D1Result[]>} batch
 */

export {};
