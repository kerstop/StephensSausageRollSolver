#![allow(unused)]
use serde::{ser::SerializeMap, Deserialize, Serialize};
use std::{
    backtrace,
    cell::OnceCell,
    collections::{HashSet, VecDeque},
    hash::{DefaultHasher, Hash, Hasher},
    rc::{Rc, Weak},
};
use wasm_bindgen::prelude::*;

#[cfg(test)]
mod test;

use bevy_math::IVec2;

#[derive(Debug, Clone, PartialEq, Eq)]
enum TileType {
    Ground,
    Grill,
    Water,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LevelDescription {
    start_pos: IVec2,
    start_dir: IVec2,
    ground: HashSet<IVec2>,
    grills: HashSet<IVec2>,
    sausages: Vec<Sausage>,
}

impl LevelDescription {
    fn get_tile_type(&self, tile: IVec2) -> TileType {
        if self.ground.contains(&tile) {
            return TileType::Ground;
        }
        if self.grills.contains(&tile) {
            return TileType::Grill;
        }
        TileType::Water
    }
}

#[derive(Debug, Clone)]
pub struct LevelState {
    player_pos: IVec2,
    player_dir: IVec2,
    sausages: Vec<Sausage>,
    neighbors: OnceCell<NodeNeighbors>,
}

impl Serialize for LevelState {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut s = serializer.serialize_map(Some(5))?;
        s.serialize_entry("id", &self.get_id());
        s.serialize_entry("player_pos", &self.player_pos);
        s.serialize_entry("player_dir", &self.player_dir);
        s.serialize_entry("sausages", &self.sausages);
        s.serialize_entry("neighbors", &self.neighbors.get());
        s.end()
    }
}

impl From<&LevelDescription> for LevelState {
    fn from(value: &LevelDescription) -> Self {
        LevelState {
            player_pos: value.start_pos,
            player_dir: value.start_dir,
            sausages: value.sausages.clone(),
            neighbors: OnceCell::new(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum LevelStatus {
    Unsolved,
    Lost,
    Solution,
    Burnt,
}

#[derive(Debug, Clone)]
struct NodeNeighbors {
    forward: Weak<LevelState>,
    back: Weak<LevelState>,
    right: Weak<LevelState>,
    left: Weak<LevelState>,
}

impl Serialize for NodeNeighbors {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        fn weak_to_id(r: &Weak<LevelState>) -> u64 {
            match r.upgrade() {
                Some(state) => state.get_id(),
                None => 0,
            }
        }
        let mut s = serializer.serialize_map(Some(4))?;
        s.serialize_entry("forward", &weak_to_id(&self.forward));
        s.serialize_entry("back", &weak_to_id(&self.back));
        s.serialize_entry("right", &weak_to_id(&self.right));
        s.serialize_entry("left", &weak_to_id(&self.left));
        s.end()
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

    fn get_status(&self, description: &LevelDescription) -> LevelStatus {
        let ground = &description.ground;
        let grills = &description.grills;
        // no sausages Lost
        for sausage in &self.sausages {
            let sausage_pos_1 = sausage.pos;
            let sausage_pos_2 = match sausage.orientation {
                SausageOrientation::Horizontal => sausage_pos_1 + IVec2::X,
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
        for sausage in &self.sausages {
            if sausage.cooked[0][0] > 1
                || sausage.cooked[0][1] > 1
                || sausage.cooked[1][0] > 1
                || sausage.cooked[1][1] > 1
            {
                return LevelStatus::Burnt;
            }
        }
        // win?
        if self.sausages.iter().all(|s| {
            s.cooked[0][0] == 1 || s.cooked[0][1] == 1 || s.cooked[1][0] == 1 || s.cooked[1][1] == 1
        }) && self.player_pos == description.start_pos
            && self.player_dir == description.start_dir
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

        if self.player_dir == input
            && description.get_tile_type(self.player_pos + input) != TileType::Water
        {
            state.push_sausages(
                state.player_pos + (state.player_dir * 2),
                state.player_dir,
                description,
            );
            state.player_pos += state.player_dir;
        }
        if -self.player_dir == input
            && description.get_tile_type(self.player_pos - self.player_dir) != TileType::Water
        {
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

impl LevelState {
    pub fn get_id(&self) -> u64 {
        let mut hasher = DefaultHasher::new();
        self.hash(&mut hasher);
        hasher.finish()
    }
}

pub struct LevelGraph {
    states: HashSet<Rc<LevelState>>,
    initial_state: Rc<LevelState>,
}

impl Serialize for LevelGraph {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut s = serializer.serialize_map(Some(3))?;
        s.serialize_entry(
            "states",
            &self
                .states
                .iter()
                .map(|l| l.as_ref())
                .collect::<Vec<&LevelState>>(),
        );
        let mut edges = Vec::new();
        self.states.iter().for_each(|s| {
            if let Some(n) = s.neighbors.get() {
                edges.push((s.get_id(), n.forward.upgrade().unwrap().get_id()));
                edges.push((s.get_id(), n.back.upgrade().unwrap().get_id()));
                edges.push((s.get_id(), n.right.upgrade().unwrap().get_id()));
                edges.push((s.get_id(), n.left.upgrade().unwrap().get_id()));
            }
        });
        s.serialize_entry("edges", &edges);
        s.serialize_entry("initial_state", self.initial_state.as_ref());
        s.end()
    }
}

#[derive(Debug, Clone, Copy, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub enum SausageOrientation {
    Horizontal,
    Vertical,
}
impl From<SausageOrientation> for IVec2 {
    fn from(value: SausageOrientation) -> Self {
        match value {
            SausageOrientation::Horizontal => IVec2::X,
            SausageOrientation::Vertical => IVec2::Y,
        }
    }
}

#[derive(Debug, Clone, Copy, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub struct Sausage {
    pos: IVec2,
    // zero is the side that is down
    cooked: [[u8; 2]; 2],
    pub orientation: SausageOrientation,
}

impl Sausage {
    pub fn check_collision(&self, x: i32, y: i32) -> bool {
        let check_pos = IVec2::new(x, y);
        check_pos == self.pos || check_pos == self.pos + IVec2::from(self.orientation)
    }

    pub fn pos(&self) -> Vec<i32> {
        vec![self.pos.x, self.pos.y]
    }

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
pub fn solve(level_description: JsValue) -> String {
    console_error_panic_hook::set_once();

    let parsed: LevelDescription = match serde_wasm_bindgen::from_value(level_description) {
        Ok(d) => d,
        Err(e) => {
            web_sys::console::log_2(&"error parsing level description".into(), &e.into());
            return "null".into();
        }
    };
    serde_json::to_string(&generate_graph(&parsed)).unwrap()
}

pub fn generate_graph(level_description: &LevelDescription) -> LevelGraph {
    let initial_state = Rc::new(LevelState::from(level_description));
    #[allow(clippy::mutable_key_type)]
    let mut states = HashSet::new();
    states.insert(Rc::clone(&initial_state));

    let mut exploration_queue: VecDeque<Rc<LevelState>> = VecDeque::new();
    exploration_queue.push_back(Rc::clone(&initial_state));

    while let Some(current_state) = exploration_queue.pop_front() {
        println!("---");
        println!("{} current node id", current_state.get_id());
        println!("{:?} node neighbors value", current_state.neighbors);
        println!("{} nodes in queue", exploration_queue.len());
        println!("{} unique states found", states.len());
        println!(
            "current node status is {:?}",
            current_state.get_status(level_description)
        );
        println!("{}", serde_json::to_string(current_state.as_ref()).unwrap());
        if current_state.neighbors.get().is_some() {
            println!("node previously explored");
            continue;
        }

        match current_state.get_status(level_description) {
            LevelStatus::Lost => continue,
            LevelStatus::Solution => continue,
            LevelStatus::Burnt => continue,
            _ => (),
        }

        let forward: Weak<LevelState> = {
            let new_state =
                Rc::new(current_state.get_next_state(level_description, current_state.player_dir));
            let saved_state = states.get_or_insert(new_state);
            exploration_queue.push_back(saved_state.clone());
            Rc::downgrade(&saved_state)
        };
        let back: Weak<LevelState> = {
            let new_state =
                Rc::new(current_state.get_next_state(level_description, -current_state.player_dir));
            let saved_state = states.get_or_insert(new_state);
            exploration_queue.push_back(saved_state.clone());
            Rc::downgrade(&saved_state)
        };
        let right: Weak<LevelState> = {
            let new_state = Rc::new(
                current_state.get_next_state(level_description, current_state.player_dir.perp()),
            );
            let saved_state = states.get_or_insert(new_state);
            exploration_queue.push_back(saved_state.clone());
            Rc::downgrade(&saved_state)
        };
        let left: Weak<LevelState> = {
            let new_state = Rc::new(
                current_state.get_next_state(level_description, current_state.player_dir.perp()),
            );
            let saved_state = states.get_or_insert(new_state);
            exploration_queue.push_back(saved_state.clone());
            Rc::downgrade(&saved_state)
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
    }

    LevelGraph {
        states,
        initial_state,
    }
}
