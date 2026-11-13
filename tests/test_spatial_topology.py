"""Contract tests for the fixed C12 physical topology (no chart calculations)."""

import json

import pytest

from ziwei.spatial import (
    BRANCHES, BRANCH_INDEX, RING_SIZE, TOPOLOGY_CONTRACT_ID,
    Relation, adjacency_matrix, branch_at, branch_index, flanks,
    four_directions, neighbors, opposite, relation_between, rotate,
    rotation_permutation, topology_manifest, trines,
)


def test_canonical_branch_identity_and_wraparound():
    assert BRANCHES == tuple("子丑寅卯辰巳午未申酉戌亥")
    assert RING_SIZE == 12
    assert tuple(BRANCH_INDEX.values()) == tuple(range(12))
    for i, branch in enumerate(BRANCHES):
        assert branch_index(branch) == i
        assert branch_at(i) == branch
        assert branch_at(i + 12) == branch_at(i - 12) == branch
    assert rotate("亥", 1) == "子"
    assert rotate("子", -1) == "亥"


@pytest.mark.parametrize("invalid", ["甲", "子宫", "", "子 ", None, 3])
def test_invalid_branch_rejected(invalid):
    with pytest.raises((TypeError, ValueError)):
        branch_index(invalid)


@pytest.mark.parametrize("invalid", [0.5, True, "4", None])
def test_invalid_integer_input_rejected(invalid):
    with pytest.raises(TypeError):
        branch_at(invalid)
    with pytest.raises(TypeError):
        rotate("子", invalid)
    with pytest.raises(TypeError):
        rotation_permutation(invalid)


def test_trines_opposites_flanks_all_twelve_nodes():
    for i, branch in enumerate(BRANCHES):
        assert neighbors(branch, Relation.SELF) == (branch,)
        assert trines(branch) == (branch_at(i + 4), branch_at(i + 8))
        assert opposite(branch) == branch_at(i + 6)
        assert opposite(opposite(branch)) == branch
        assert flanks(branch) == (branch_at(i - 1), branch_at(i + 1))
        assert four_directions(branch) == (
            branch, branch_at(i + 4), branch_at(i + 8), branch_at(i + 6)
        )
        assert len(set(four_directions(branch))) == 4
        assert branch in trines(trines(branch)[0])
        assert branch in trines(trines(branch)[1])
    assert trines("辰") == ("申", "子")
    assert opposite("辰") == "戌"
    assert flanks("辰") == ("卯", "巳")
    assert four_directions("辰") == ("辰", "申", "子", "戌")


def test_relation_types_and_unrelated_positions():
    assert relation_between("辰", "辰") is Relation.SELF
    assert relation_between("辰", "申") is Relation.TRINE
    assert relation_between("辰", "子") is Relation.TRINE
    assert relation_between("辰", "戌") is Relation.OPPOSITE
    assert relation_between("辰", "卯") is Relation.FLANK_PREVIOUS
    assert relation_between("辰", "巳") is Relation.FLANK_NEXT
    assert relation_between("辰", "午") is None
    assert relation_between("子", "亥") is Relation.FLANK_PREVIOUS
    assert relation_between("亥", "子") is Relation.FLANK_NEXT
    with pytest.raises(TypeError):
        neighbors("子", "TRINE")  # type: ignore[arg-type]


def test_adjacency_matrices_cover_all_nodes_without_false_edges():
    expected_out_degrees = {
        Relation.SELF: 1, Relation.TRINE: 2, Relation.OPPOSITE: 1,
        Relation.FLANK_PREVIOUS: 1, Relation.FLANK_NEXT: 1,
    }
    for relation, degree in expected_out_degrees.items():
        matrix = adjacency_matrix(relation)
        assert len(matrix) == 12
        assert all(len(row) == 12 and sum(row) == degree for row in matrix)
        for i, branch in enumerate(BRANCHES):
            expected = set(neighbors(branch, relation))
            actual = {BRANCHES[j] for j, v in enumerate(matrix[i]) if v}
            assert actual == expected
            for j, target in enumerate(BRANCHES):
                assert matrix[i][j] == int(relation_between(branch, target) == relation)
                if relation in (Relation.TRINE, Relation.OPPOSITE, Relation.SELF):
                    assert matrix[i][j] == matrix[j][i]
    assert adjacency_matrix(Relation.FLANK_PREVIOUS)[0][11] == 1
    assert adjacency_matrix(Relation.FLANK_NEXT)[11][0] == 1


def test_rotation_preserves_topology_for_all_shifts():
    for steps in range(-13, 14):
        permutation = rotation_permutation(steps)
        assert sorted(permutation) == list(range(12))
        for branch in BRANCHES:
            r = rotate(branch, steps)
            assert rotate(r, -steps) == branch
            assert rotate(opposite(branch), steps) == opposite(r)
            assert tuple(rotate(x, steps) for x in trines(branch)) == trines(r)
            assert tuple(rotate(x, steps) for x in flanks(branch)) == flanks(r)
            for target in BRANCHES:
                assert relation_between(branch, target) == relation_between(
                    rotate(branch, steps), rotate(target, steps)
                )


def test_manifest_contract_and_immutability():
    manifest = topology_manifest()
    assert manifest["contract_id"] == TOPOLOGY_CONTRACT_ID
    assert manifest["branch_order"] == list(BRANCHES)
    assert manifest["relations"]["TRINE"] == [4, 8]
    assert manifest["relations"]["FLANK_PREVIOUS"] == [11]
    assert json.loads(json.dumps(manifest, ensure_ascii=False)) == manifest
    with pytest.raises(TypeError):
        BRANCH_INDEX["子"] = 99  # type: ignore[index]
