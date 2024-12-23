use super::*;
use std::cell::OnceCell;
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
    };
    state.push_sausages(IVec2::new(0, 0), IVec2::X, &description);
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
        }
    );
    state.push_sausages(IVec2::new(1, 0), -IVec2::X, &description);
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
    };
    state.push_sausages(IVec2::new(0, 0), IVec2::Y, &description);
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
        }
    );
    state.push_sausages(IVec2::new(0, 1), -IVec2::Y, &description);
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
    };
    state.push_sausages(IVec2::new(0, 0), IVec2::X, &description);
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
    };
    state.push_sausages(IVec2::new(0, 0), IVec2::X, &description);
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
        }
    );
}

#[test]
fn generate_graph_works() {
    let level_description: LevelDescription = serde_json::from_str(r#"
    {"start_pos":[2,2],"start_dir":[0,-1],"ground":[[4,1],[2,2],[3,2],[4,2]],"grills":[[5,1],[6,1],[5,2],[6,2]],"sausages":[{"pos":[4,1],"cooked":[[0,0],[0,0]],"orientation":"Vertical"}]}
    "#.trim()).unwrap();

    generate_graph(&level_description);
}
