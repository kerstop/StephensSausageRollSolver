use super::*;
use std::cell::OnceCell;
#[test]
fn push_sausages() {
    let mut state = LevelState {
        player_pos: IVec2::new(-10, -10),
        player_dir: IVec2::X,
        sausages: vec![Sausage {
            pos: IVec2::new(0, 0),
            cooked: [[0, 1], [0, 0]],
            orientation: SausageOrientation::Horizantal,
        }],
        neighbors: OnceCell::new(),
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
                orientation: SausageOrientation::Horizantal,
            }],
            neighbors: OnceCell::new(),
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
                orientation: SausageOrientation::Horizantal,
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
            orientation: SausageOrientation::Horizantal,
        }],
        neighbors: OnceCell::new(),
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
                orientation: SausageOrientation::Horizantal,
            }],
            neighbors: OnceCell::new(),
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
                orientation: SausageOrientation::Horizantal,
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
                orientation: SausageOrientation::Horizantal,
            },
            Sausage {
                pos: IVec2::new(2, 0),
                cooked: [[0, 1], [0, 0]],
                orientation: SausageOrientation::Horizantal,
            },
        ],
        neighbors: OnceCell::new(),
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
                    orientation: SausageOrientation::Horizantal,
                },
                Sausage {
                    pos: IVec2::new(3, 0),
                    cooked: [[0, 1], [0, 0]],
                    orientation: SausageOrientation::Horizantal,
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
        }
    );
}
