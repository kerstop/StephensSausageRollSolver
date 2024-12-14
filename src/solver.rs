#![allow(unused)]
use std::{
    backtrace,
    cell::OnceCell,
    collections::{HashSet, VecDeque},
    hash::Hash,
    rc::{Rc, Weak},
};
use wasm_bindgen::prelude::*;

#[cfg(test)]
mod test;

use bevy_math::IVec2;

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct LevelDescription {
    start_pos: IVec2,
    start_dir: IVec2,
    ground: HashSet<IVec2>,
    grills: HashSet<IVec2>,
    sausages: Vec<Sausage>,
}

#[derive(Clone, Copy)]
#[wasm_bindgen]
pub struct JSVec {
    pub x: i32,
    pub y: i32,
}

impl From<JSVec> for IVec2 {
    fn from(value: JSVec) -> Self {
        IVec2::new(value.x, value.y)
    }
}

#[wasm_bindgen]
impl LevelDescription {
    #[wasm_bindgen(constructor)]
    pub fn constructor(
        start_pos: JSVec,
        start_dir: JSVec,
        ground: Vec<JSVec>,
        grills: Vec<JSVec>,
        sausages: Vec<Sausage>,
    ) -> LevelDescription {
        LevelDescription {
            start_pos: start_pos.into(),
            start_dir: start_dir.into(),
            ground: ground.iter().map(|v| IVec2::from(*v)).collect(),
            grills: ground.iter().map(|v| IVec2::from(*v)).collect(),
            sausages,
        }
    }
}

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct LevelState {
    player_pos: IVec2,
    player_dir: IVec2,
    sausages: Vec<Sausage>,
    neighbors: OnceCell<NodeNeighbors>,
}

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub enum LevelStatus {
    Unsolved,
    Lost,
    Solution,
    Burnt,
}

#[derive(Debug, Clone)]
#[wasm_bindgen]
struct NodeNeighbors {
    forward: Weak<LevelState>,
    back: Weak<LevelState>,
    right: Weak<LevelState>,
    left: Weak<LevelState>,
}

#[wasm_bindgen]
impl NodeNeighbors {
    #[wasm_bindgen(getter)]
    pub fn forward(&self) -> Option<LevelState> {
        Some((*self.forward.upgrade()?).clone())
    }
    #[wasm_bindgen(getter)]
    pub fn back(&self) -> Option<LevelState> {
        Some((*self.back.upgrade()?).clone())
    }
    #[wasm_bindgen(getter)]
    pub fn right(&self) -> Option<LevelState> {
        Some((*self.right.upgrade()?).clone())
    }
    #[wasm_bindgen(getter)]
    pub fn left(&self) -> Option<LevelState> {
        Some((*self.left.upgrade()?).clone())
    }
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

    fn get_status(state: &LevelState, description: &LevelDescription) -> LevelStatus {
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
                return LevelStatus::Lost;
            }
        }
        // no sausages burnt
        for sausage in &state.sausages {
            if sausage.cooked[0][0] > 1
                || sausage.cooked[0][1] > 1
                || sausage.cooked[1][0] > 1
                || sausage.cooked[1][1] > 1
            {
                return LevelStatus::Burnt;
            }
        }
        // win?
        if state.sausages.iter().all(|s| {
            s.cooked[0][0] == 1 || s.cooked[0][1] == 1 || s.cooked[1][0] == 1 || s.cooked[1][1] == 1
        }) && state.player_pos == description.start_pos
            && state.player_dir == description.start_dir
        {
            return LevelStatus::Solution;
        }

        LevelStatus::Unsolved
    }

    fn push_sausages(&mut self, pos: IVec2, dir: IVec2, description: &LevelDescription) {
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
            self.push_sausages(tiles_to_clear[0], dir, description);
            self.push_sausages(tiles_to_clear[1], dir, description);
        } else {
            //sliding
            let sausage_pos = sausage_to_push.pos;
            if dir == IVec2::from(sausage_to_push.orientation) {
                self.push_sausages(sausage_pos + (dir * 2), dir, description)
            } else {
                self.push_sausages(sausage_pos + dir, dir, description);
            }
        }
        self.sausages[i].pos += dir;
        if description.grills.contains(&self.sausages[i].pos) {
            self.sausages[i].cooked[0][0] += 1
        }
        if description
            .grills
            .contains(&(self.sausages[i].pos + IVec2::from(self.sausages[i].orientation)))
        {
            self.sausages[i].cooked[0][1] += 1
        }
    }

    fn get_next_state(&self, description: &LevelDescription, input: IVec2) -> LevelState {
        let mut state = self.clone();

        match input {
            IVec2 { x: 1, y: 0 } => (),
            IVec2 { x: 0, y: 1 } => (),
            IVec2 { x: -1, y: 0 } => (),
            IVec2 { x: 0, y: -1 } => (),
            _ => panic!("get_next_state was supplied a vector that was not a basis vector"),
        };

        if self.player_dir == input {
            state.push_sausages(
                state.player_pos + (state.player_dir * 2),
                state.player_dir,
                description,
            );
            state.player_pos += state.player_dir;
        }
        if -self.player_dir == input {
            state.push_sausages(
                state.player_pos - state.player_dir,
                -state.player_dir,
                description,
            );
            state.player_pos -= state.player_dir;
        }
        if self.player_dir.perp() == input {
            let perp = self.player_dir.perp();
            state.push_sausages(
                state.player_pos + state.player_dir + perp,
                perp,
                description,
            );
            state.push_sausages(state.player_pos + perp, -state.player_dir, description);
            state.player_dir = perp;
        }
        if -self.player_dir.perp() == input {
            let perp = -self.player_dir.perp();
            state.push_sausages(
                state.player_pos + state.player_dir + perp,
                perp,
                description,
            );
            state.push_sausages(state.player_pos + perp, -state.player_dir, description);
            state.player_dir = perp;
        }

        if description.grills.contains(&state.player_pos) {
            state.player_pos -= input
        }

        state
    }
}

#[wasm_bindgen]
pub struct LevelGraph {
    states: HashSet<Rc<LevelState>>,
    initial_state: Rc<LevelState>,
}

#[wasm_bindgen]
impl LevelGraph {
    #[wasm_bindgen(getter)]
    pub fn initial_state(&self) -> LevelState {
        (*self.initial_state).clone()
    }
}

#[derive(Debug, Clone, Copy, Hash, Eq, PartialEq)]
#[wasm_bindgen]
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
#[wasm_bindgen]
pub struct Sausage {
    pos: IVec2,
    // zero is the side that is down
    cooked: [[u8; 2]; 2],
    pub orientation: SausageOrientation,
}

#[wasm_bindgen]
impl Sausage {
    #[wasm_bindgen(constructor)]
    pub fn new(pos_x: i32, pos_y: i32, orientation: SausageOrientation) -> Self {
        Sausage {
            pos: IVec2::new(pos_x, pos_y),
            cooked: [[0, 0], [0, 0]],
            orientation,
        }
    }

    #[wasm_bindgen]
    pub fn check_collision(&self, x: i32, y: i32) -> bool {
        let check_pos = IVec2::new(x, y);
        check_pos == self.pos || check_pos == self.pos + IVec2::from(self.orientation)
    }

    #[wasm_bindgen(getter)]
    pub fn pos(&self) -> Vec<i32> {
        vec![self.pos.x, self.pos.y]
    }

    #[wasm_bindgen(getter)]
    pub fn cooked(&self) -> Vec<u8> {
        vec![
            self.cooked[0][0],
            self.cooked[0][1],
            self.cooked[1][0],
            self.cooked[1][1],
        ]
    }
}

#[wasm_bindgen]
pub fn generate_graph(level_description: LevelDescription) -> LevelGraph {
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
            let new_state =
                Rc::new(current_state.get_next_state(&level_description, current_state.player_dir));
            states.insert(new_state.clone());
            exploration_queue.push_back(new_state.clone());
            Rc::downgrade(&new_state)
        };
        let back: Weak<LevelState> = {
            let new_state = Rc::new(
                current_state.get_next_state(&level_description, -current_state.player_dir),
            );
            states.insert(new_state.clone());
            exploration_queue.push_back(new_state.clone());
            Rc::downgrade(&new_state)
        };
        let right: Weak<LevelState> = {
            let new_state = Rc::new(
                current_state.get_next_state(&level_description, current_state.player_dir.perp()),
            );
            states.insert(new_state.clone());
            exploration_queue.push_back(new_state.clone());
            Rc::downgrade(&new_state)
        };
        let left: Weak<LevelState> = {
            let new_state = Rc::new(
                current_state.get_next_state(&level_description, current_state.player_dir.perp()),
            );
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
