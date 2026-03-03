/**
 * Basic cyclomatic complexity helper.
 * The formula M = E - N + 2P is equivalent to "1 + decision points"
 * when you treat P (connected components) as 1 and count each branch as
 * increasing the number of edges by one compared to nodes.  For the
 * purposes of this first story we simply expose a helper that takes the
 * number of decision points and returns the complexity value.
 */

export function complexityFromDecisions(decisions, exits = 1) {
    // exits defaults to 1 (one entry point for a function)
    return exits + decisions;
}
