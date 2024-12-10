#![allow(unused)]
use std::{
    backtrace,
    cell::OnceCell,
    collections::{HashSet, VecDeque},
    hash::Hash,
    rc::{Rc, Weak},
};

#[cfg(test)]
mod test;

use bevy_math::IVec2;

pub enum Direction {
    Up,
    Right,
    Down,
    Left,
}

#[derive(Debug, Clone)]
pub struct LevelDescription {
    start_pos: IVec2,
    start_dir: IVec2,
    ground: HashSet<IVec2>,
    grills: HashSet<IVec2>,
    sausages: Vec<Sausage>,
}

#[derive(Debug, Clone)]
pub struct LevelState {
    player_pos: IVec2,
    player_dir: IVec2,
    sausages: Vec<Sausage>,
    neighbors: OnceCell<NodeNeighbors>,
}

#[derive(Debug, Clone)]
struct NodeNeighbors {
    forward: Weak<LevelState>,
    back: Weak<LevelState>,
    right: Weak<LevelState>,
    left: Weak<LevelState>,
}

impl Hash for LevelState {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.player_pos.hash(state);
        self.player_dir.hash(state);
        self.sausages.hash(state);
    }
}
impl PartialEq for LevelState {
    fn eq(&self, other: &Self) -> bool {
        self.player_pos == other.player_pos
            && self.player_dir == other.player_dir
            && self.sausages == other.sausages
    }
}
impl Eq for LevelState {}
impl LevelState {
    fn get_sausage(&self, pos: IVec2) -> Option<&Sausage> {
        self.sausages
            .iter()
            .find(|s| s.pos == pos || s.pos + IVec2::from(s.orientation) == pos)
    }

    fn get_sausage_mut(&mut self, pos: IVec2) -> Option<&mut Sausage> {
        self.sausages
            .iter_mut()
            .find(|s| s.pos == pos || s.pos + IVec2::from(s.orientation) == pos)
    }

    fn push_sausages(&mut self, pos: IVec2, dir: IVec2) {
        let (i, sausage_to_push) = match self
            .sausages
            .iter_mut()
            .enumerate()
            .find(|(i, s)| s.pos == pos || s.pos + IVec2::from(s.orientation) == pos)
        {
            Some(s) => s,
            None => return,
        };

        if dir.dot(sausage_to_push.orientation.into()) == 0 {
            //rolling
            (sausage_to_push.cooked[0], sausage_to_push.cooked[1]) =
                (sausage_to_push.cooked[1], sausage_to_push.cooked[0]);
            let tiles_to_clear = [
                sausage_to_push.pos + dir,
                sausage_to_push.pos + IVec2::from(sausage_to_push.orientation) + dir,
            ];
            self.push_sausages(tiles_to_clear[0], dir);
            self.push_sausages(tiles_to_clear[1], dir);
        } else {
            //sliding
            let sausage_pos = sausage_to_push.pos;
            if dir == IVec2::from(sausage_to_push.orientation) {
                self.push_sausages(sausage_pos + (dir * 2), dir)
            } else {
                self.push_sausages(sausage_pos + dir, dir);
            }
        }
        self.sausages[i].pos += dir;
    }
}

pub struct LevelGraph {
    states: HashSet<Rc<LevelState>>,
    initial_state: Rc<LevelState>,
}

#[derive(Debug, Clone, Copy, Hash, Eq, PartialEq)]
pub enum SausageOrientation {
    Horizantal,
    Vertical,
}
impl From<SausageOrientation> for IVec2 {
    fn from(value: SausageOrientation) -> Self {
        match value {
            SausageOrientation::Horizantal => IVec2::X,
            SausageOrientation::Vertical => IVec2::Y,
        }
    }
}

#[derive(Debug, Clone, Copy, Hash, Eq, PartialEq)]
pub struct Sausage {
    pos: IVec2,
    // zero is the side that is down
    cooked: [[u8; 2]; 2],
    orientation: SausageOrientation,
}

fn generate_graph(level_description: LevelDescription) -> LevelGraph {
    let initial_state = Rc::new(LevelState {
        player_pos: level_description.start_pos,
        player_dir: level_description.start_dir,
        sausages: level_description.sausages.clone(),
        neighbors: OnceCell::new(),
    });
    #[allow(clippy::mutable_key_type)]
    let mut states = HashSet::new();
    states.insert(Rc::clone(&initial_state));

    let mut exploration_queue: VecDeque<Rc<LevelState>> = VecDeque::new();
    exploration_queue.push_back(Rc::clone(&initial_state));

    while let Some(current_state) = exploration_queue.pop_front() {
        if current_state.neighbors.get().is_some() {
            continue;
        }

        let forward: Weak<LevelState> = {
            let mut new_state = (*current_state).clone();

            new_state.push_sausages(
                new_state.player_pos + (new_state.player_dir * 2),
                new_state.player_dir,
            );
            new_state.player_pos += new_state.player_dir;

            let new_state = Rc::new(new_state);
            states.insert(new_state.clone());
            exploration_queue.push_back(new_state.clone());
            Rc::downgrade(&new_state)
        };
        let back: Weak<LevelState> = {
            let mut new_state = (*current_state).clone();

            new_state.push_sausages(
                new_state.player_pos - new_state.player_dir,
                -new_state.player_dir,
            );
            new_state.player_pos -= new_state.player_dir;

            let new_state = Rc::new(new_state);
            states.insert(new_state.clone());
            exploration_queue.push_back(new_state.clone());
            Rc::downgrade(&new_state)
        };
        let right: Weak<LevelState> = {
            let mut new_state = (*current_state).clone();
            let perp = new_state.player_dir.perp();

            new_state.push_sausages(new_state.player_pos + new_state.player_dir + perp, perp);
            new_state.push_sausages(new_state.player_pos + perp, -new_state.player_dir);
            new_state.player_dir = perp;

            let new_state = Rc::new(new_state);
            states.insert(new_state.clone());
            exploration_queue.push_back(new_state.clone());
            Rc::downgrade(&new_state)
        };
        let left: Weak<LevelState> = {
            let mut new_state = (*current_state).clone();
            let perp = -new_state.player_dir.perp();

            new_state.push_sausages(new_state.player_pos + new_state.player_dir + perp, perp);
            new_state.push_sausages(new_state.player_pos + perp, -new_state.player_dir);
            new_state.player_dir = perp;

            let new_state = Rc::new(new_state);
            states.insert(new_state.clone());
            exploration_queue.push_back(new_state.clone());
            Rc::downgrade(&new_state)
        };

        current_state
            .neighbors
            .set(NodeNeighbors {
                forward,
                back,
                right,
                left,
            })
            .unwrap();

        todo!()
    }

    LevelGraph {
        states,
        initial_state,
    }
}

enum StateProgress {
    Unsolved,
    Lost,
    Solution,
    Burnt,
}

fn evaluate_level_state_progress(
    state: &LevelState,
    description: &LevelDescription,
) -> StateProgress {
    let ground = &description.ground;
    let grills = &description.grills;
    // no sausages Lost
    for sausage in &state.sausages {
        let sausage_pos_1 = sausage.pos;
        let sausage_pos_2 = match sausage.orientation {
            SausageOrientation::Horizantal => sausage_pos_1 + IVec2::X,
            SausageOrientation::Vertical => sausage_pos_1 + IVec2::Y,
        };
        if !(ground.contains(&sausage_pos_1)
            || ground.contains(&sausage_pos_2)
            || grills.contains(&sausage_pos_1)
            || grills.contains(&sausage_pos_2))
        {
            return StateProgress::Lost;
        }
    }
    // no sausages burnt
    for sausage in &state.sausages {
        if sausage.cooked[0][0] > 1
            || sausage.cooked[0][1] > 1
            || sausage.cooked[1][0] > 1
            || sausage.cooked[1][1] > 1
        {
            return StateProgress::Burnt;
        }
    }
    // win?
    if state.sausages.iter().all(|s| {
        s.cooked[0][0] == 1 || s.cooked[0][1] == 1 || s.cooked[1][0] == 1 || s.cooked[1][1] == 1
    }) && state.player_pos == description.start_pos
        && state.player_dir == description.start_dir
    {
        return StateProgress::Solution;
    }

    StateProgress::Unsolved
}
