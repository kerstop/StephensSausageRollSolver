use super::*;
use std::{cell::OnceCell, str::FromStr};

fn level_state_from_json(json: &'static str) -> LevelState {
    let level_description: LevelDescription =
        serde_json::from_str(json).expect("json should contain a valid level description");
    LevelState::from(&level_description)
}

#[test]
fn push_sausages() {
    let description = LevelDescription {
        start_pos: IVec2::ZERO,
        start_dir: IVec2::X,
        ground: HashSet::new(),
        grills: HashSet::new(),
        sausages: Vec::new(),
    };
    let mut state = LevelState {
        player_pos: IVec2::new(-10, -10),
        player_dir: IVec2::X,
        sausages: vec![Sausage {
            pos: IVec2::new(0, 0),
            cooked: [[0, 1], [0, 0]],
            orientation: SausageOrientation::Horizontal,
        }],
        neighbors: OnceCell::new(),
        description: &description,
    };
    state.push_sausages(IVec2::new(0, 0), IVec2::X);
    assert_eq!(
        state,
        LevelState {
            player_pos: IVec2::new(-10, -10),
            player_dir: IVec2::X,
            sausages: vec![Sausage {
                pos: IVec2::new(1, 0),
                cooked: [[0, 1], [0, 0]],
                orientation: SausageOrientation::Horizontal,
            }],
            neighbors: OnceCell::new(),
            description: &description,
        }
    );
    state.push_sausages(IVec2::new(1, 0), -IVec2::X);
    assert_eq!(
        state,
        LevelState {
            player_pos: IVec2::new(-10, -10),
            player_dir: IVec2::X,
            sausages: vec![Sausage {
                pos: IVec2::new(0, 0),
                cooked: [[0, 1], [0, 0]],
                orientation: SausageOrientation::Horizontal,
            }],
            neighbors: OnceCell::new(),
            description: &description,
        }
    );

    let mut state = LevelState {
        player_pos: IVec2::new(-10, -10),
        player_dir: IVec2::X,
        sausages: vec![Sausage {
            pos: IVec2::new(0, 0),
            cooked: [[0, 1], [0, 0]],
            orientation: SausageOrientation::Horizontal,
        }],
        neighbors: OnceCell::new(),
        description: &description,
    };
    state.push_sausages(IVec2::new(0, 0), IVec2::Y);
    assert_eq!(
        state,
        LevelState {
            player_pos: IVec2::new(-10, -10),
            player_dir: IVec2::X,
            sausages: vec![Sausage {
                pos: IVec2::new(0, 1),
                cooked: [[0, 0], [0, 1]],
                orientation: SausageOrientation::Horizontal,
            }],
            neighbors: OnceCell::new(),
            description: &description,
        }
    );
    state.push_sausages(IVec2::new(0, 1), -IVec2::Y);
    assert_eq!(
        state,
        LevelState {
            player_pos: IVec2::new(-10, -10),
            player_dir: IVec2::X,
            sausages: vec![Sausage {
                pos: IVec2::new(0, 0),
                cooked: [[0, 1], [0, 0]],
                orientation: SausageOrientation::Horizontal,
            }],
            neighbors: OnceCell::new(),
            description: &description,
        }
    );

    let mut state = LevelState {
        player_pos: IVec2::new(-10, -10),
        player_dir: IVec2::X,
        sausages: vec![
            Sausage {
                pos: IVec2::new(0, 0),
                cooked: [[0, 1], [0, 0]],
                orientation: SausageOrientation::Horizontal,
            },
            Sausage {
                pos: IVec2::new(2, 0),
                cooked: [[0, 1], [0, 0]],
                orientation: SausageOrientation::Horizontal,
            },
        ],
        neighbors: OnceCell::new(),
        description: &description,
    };
    state.push_sausages(IVec2::new(0, 0), IVec2::X);
    assert_eq!(
        state,
        LevelState {
            player_pos: IVec2::new(-10, -10),
            player_dir: IVec2::X,
            sausages: vec![
                Sausage {
                    pos: IVec2::new(1, 0),
                    cooked: [[0, 1], [0, 0]],
                    orientation: SausageOrientation::Horizontal,
                },
                Sausage {
                    pos: IVec2::new(3, 0),
                    cooked: [[0, 1], [0, 0]],
                    orientation: SausageOrientation::Horizontal,
                }
            ],
            neighbors: OnceCell::new(),
            description: &description,
        }
    );

    let mut state = LevelState {
        player_pos: IVec2::new(-10, -10),
        player_dir: IVec2::X,
        sausages: vec![
            Sausage {
                pos: IVec2::new(0, 0),
                cooked: [[0, 1], [0, 0]],
                orientation: SausageOrientation::Vertical,
            },
            Sausage {
                pos: IVec2::new(1, 0),
                cooked: [[0, 1], [0, 0]],
                orientation: SausageOrientation::Vertical,
            },
        ],
        neighbors: OnceCell::new(),
        description: &description,
    };
    state.push_sausages(IVec2::new(0, 0), IVec2::X);
    assert_eq!(
        state,
        LevelState {
            player_pos: IVec2::new(-10, -10),
            player_dir: IVec2::X,
            sausages: vec![
                Sausage {
                    pos: IVec2::new(1, 0),
                    cooked: [[0, 0], [0, 1]],
                    orientation: SausageOrientation::Vertical,
                },
                Sausage {
                    pos: IVec2::new(2, 0),
                    cooked: [[0, 0], [0, 1]],
                    orientation: SausageOrientation::Vertical,
                }
            ],
            neighbors: OnceCell::new(),
            description: &description,
        }
    );
}

#[test]
fn level_statuses() {
    let lost_description: LevelDescription = serde_json::from_str(r#"
{"start_pos":[1,2],"start_dir":[1,0],"ground":[[2,1],[3,1],[1,2],[2,2],[3,2]],"grills":[],"sausages":[{"pos":[4,1],"cooked":[[0,0],[0,0]],"orientation":"Vertical"}]}
    "#.trim()).unwrap();
    let lost_level = LevelState::from(&lost_description);
    assert_eq!(lost_level.get_status(), LevelStatus::Lost);

    let solved_description: LevelDescription = serde_json::from_str(r#"
{"start_pos":[1,2],"start_dir":[1,0],"ground":[[2,1],[3,1],[4,1],[1,2],[2,2],[3,2],[4,2]],"grills":[],"sausages":[{"pos":[4,1],"cooked":[[1,1],[1,1]],"orientation":"Vertical"}]}
    "#.trim()).unwrap();
    let solved_level = LevelState::from(&solved_description);
    assert_eq!(solved_level.get_status(), LevelStatus::Solution);

    let burnt_description: LevelDescription = serde_json::from_str(r#"
{"start_pos":[1,2],"start_dir":[1,0],"ground":[[2,1],[3,1],[4,1],[1,2],[2,2],[3,2],[4,2]],"grills":[],"sausages":[{"pos":[4,1],"cooked":[[2,2],[2,2]],"orientation":"Vertical"}]}
    "#.trim()).unwrap();
    let burnt_level = LevelState::from(&burnt_description);
    assert_eq!(burnt_level.get_status(), LevelStatus::Burnt);
}

#[test]
fn generate_graph_works() {
    let level_description: LevelDescription = serde_json::from_str(r#"
    {"start_pos":[2,2],"start_dir":[0,-1],"ground":[[4,1],[2,2],[3,2],[4,2]],"grills":[[5,1],[6,1],[5,2],[6,2]],"sausages":[{"pos":[4,1],"cooked":[[0,0],[0,0]],"orientation":"Vertical"}]}
    "#.trim()).unwrap();

    generate_graph(&level_description);
}
