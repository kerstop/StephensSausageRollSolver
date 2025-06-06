#![allow(unused)]
use serde::{ser::SerializeMap, Deserialize, Serialize};
use std::{
    backtrace,
    cell::OnceCell,
    collections::{HashSet, VecDeque},
    hash::{DefaultHasher, Hash, Hasher},
    sync::{Arc, Weak},
};
use wasm_bindgen::prelude::*;

#[cfg(test)]
mod test;

use bevy::math::IVec3;

#[derive(Debug, Clone, PartialEq, Eq)]
enum TileType {
    Ground,
    Grill,
    Water,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LevelDescription {
    start_pos: IVec3,
    start_dir: IVec3,
    ground: HashSet<IVec3>,
    grills: HashSet<IVec3>,
    sausages: Vec<Sausage>,
}

impl LevelDescription {
    fn get_tile_type(&self, tile: IVec3) -> TileType {
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
    player_pos: IVec3,
    player_dir: IVec3,
    sausages: Vec<Sausage>,
    description: Arc<LevelDescription>,
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
        s.serialize_entry("status", &self.get_status());
        s.end()
    }
}

impl From<&LevelDescription> for LevelState {
    fn from(value: &LevelDescription) -> Self {
        LevelState {
            player_pos: value.start_pos,
            player_dir: value.start_dir,
            sausages: value.sausages.clone(),
            description: Arc::new(value.clone()),
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
    fn get_sausage(&self, pos: IVec3) -> Option<&Sausage> {
        self.sausages
            .iter()
            .find(|s| s.pos == pos || s.pos + IVec3::from(s.orientation) == pos)
    }

    fn get_sausage_mut(&mut self, pos: IVec3) -> Option<&mut Sausage> {
        self.sausages
            .iter_mut()
            .find(|s| s.pos == pos || s.pos + IVec3::from(s.orientation) == pos)
    }

    fn get_status(&self) -> LevelStatus {
        let ground = &self.description.ground;
        let grills = &self.description.grills;
        // no sausages Lost
        for sausage in &self.sausages {
            if sausage.pos.z < 1 {
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
            s.cooked[0][0] == 1 && s.cooked[0][1] == 1 && s.cooked[1][0] == 1 && s.cooked[1][1] == 1
        }) && self.player_pos == self.description.start_pos
            && self.player_dir == self.description.start_dir
        {
            return LevelStatus::Solution;
        }

        LevelStatus::Unsolved
    }

    fn can_push(&self, pos: IVec3, dir: IVec3) -> bool {
        if self.description.ground.contains(&pos) || self.description.grills.contains(&pos) {
            return false;
        }
        let (i, sausage_to_push) = match self
            .sausages
            .iter()
            .enumerate()
            .find(|(i, s)| s.pos == pos || s.pos + IVec3::from(s.orientation) == pos)
        {
            Some(s) => s,
            None => return true,
        };

        if dir.dot(sausage_to_push.orientation.into()) == 0 {
            //rolling
            let tiles_to_clear = [
                sausage_to_push.pos + dir,
                sausage_to_push.pos + IVec3::from(sausage_to_push.orientation) + dir,
            ];
            self.can_push(tiles_to_clear[0], dir) && self.can_push(tiles_to_clear[1], dir)
        } else {
            //sliding
            let sausage_pos = sausage_to_push.pos;
            if dir == IVec3::from(sausage_to_push.orientation) {
                self.can_push(sausage_pos + (dir * 2), dir)
            } else {
                self.can_push(sausage_pos + dir, dir)
            }
        }
    }

    fn push(&mut self, pos: IVec3, dir: IVec3) {
        let (i, sausage_to_push) = match self
            .sausages
            .iter_mut()
            .enumerate()
            .find(|(i, s)| s.pos == pos || s.pos + IVec3::from(s.orientation) == pos)
        {
            Some(s) => s,
            None => return,
        };

        if dir.dot(sausage_to_push.orientation.into()) == 0 {
            //rolling
            let tiles_to_clear = [
                sausage_to_push.pos + dir,
                sausage_to_push.pos + IVec3::from(sausage_to_push.orientation) + dir,
            ];
            (sausage_to_push.cooked[0], sausage_to_push.cooked[1]) =
                (sausage_to_push.cooked[1], sausage_to_push.cooked[0]);
        } else {
            //sliding
            let sausage_pos = sausage_to_push.pos;
            if dir == IVec3::from(sausage_to_push.orientation) {
                self.push(sausage_pos + (dir * 2), dir);
            } else {
                self.push(sausage_pos + dir, dir);
            };
        }
        self.sausages[i].pos += dir;
        if self
            .description
            .grills
            .contains(&(self.sausages[i].pos + IVec3::NEG_Z))
        {
            self.sausages[i].cooked[0][0] += 1
        }
        if self.description.grills.contains(
            &(self.sausages[i].pos + IVec3::from(self.sausages[i].orientation) + IVec3::NEG_Z),
        ) {
            self.sausages[i].cooked[0][1] += 1
        }
    }

    fn get_next_state(&self, input: IVec3) -> LevelState {
        let mut state = self.clone();

        match input {
            IVec3 { x: 1, y: 0, z: 0 } => (),
            IVec3 { x: 0, y: 1, z: 0 } => (),
            IVec3 { x: -1, y: 0, z: 0 } => (),
            IVec3 { x: 0, y: -1, z: 0 } => (),
            _ => panic!("get_next_state was supplied a vector that was not a valid input"),
        };

        if self.player_dir == input
            && (self
                .description
                .get_tile_type(self.player_pos + input + IVec3::NEG_Z)
                == TileType::Ground
                || self
                    .description
                    .get_tile_type(self.player_pos + input + IVec3::NEG_Z)
                    == TileType::Grill)
        {
            if state.can_push(state.player_pos + (state.player_dir * 2), state.player_dir) {
                state.push(state.player_pos + (state.player_dir * 2), state.player_dir);
            }
            state.player_pos += state.player_dir;
        }
        if -self.player_dir == input
            && (self
                .description
                .get_tile_type(self.player_pos - self.player_dir + IVec3::NEG_Z)
                == TileType::Ground
                || self
                    .description
                    .get_tile_type(self.player_pos - self.player_dir + IVec3::NEG_Z)
                    == TileType::Grill)
            && state.can_push(state.player_pos - state.player_dir, -state.player_dir)
        {
            state.push(state.player_pos - state.player_dir, -state.player_dir);
            state.player_pos -= state.player_dir;
        }
        if self.player_dir.cross(IVec3::Z) == input {
            let left = self.player_dir.cross(IVec3::Z);
            if state.can_push(state.player_pos + state.player_dir + left, left) {
                state.push(state.player_pos + state.player_dir + left, left);

                if state.can_push(state.player_pos + left, -state.player_dir) {
                    state.push(state.player_pos + left, -state.player_dir);
                    state.player_dir = left;
                }
            }
        }
        if -self.player_dir.cross(IVec3::Z) == input {
            let right = -self.player_dir.cross(IVec3::Z);
            if state.can_push(state.player_pos + state.player_dir + right, right) {
                state.push(state.player_pos + state.player_dir + right, right);

                if state.can_push(state.player_pos + right, -state.player_dir) {
                    state.push(state.player_pos + right, -state.player_dir);
                    state.player_dir = right;
                }
            }
        }

        if self
            .description
            .grills
            .contains(&(state.player_pos + IVec3::NEG_Z))
        {
            state.player_pos -= input
        }

        for i in 0..state.sausages.len() {
            let sausage = state.sausages.get(i).unwrap();
            if !(state
                .description
                .ground
                .contains(&(sausage.pos + IVec3::NEG_Z))
                || state
                    .description
                    .grills
                    .contains(&(sausage.pos + IVec3::NEG_Z))
                || state.get_sausage(sausage.pos + IVec3::NEG_Z).is_some()
                || state
                    .description
                    .ground
                    .contains(&(sausage.pos2() + IVec3::NEG_Z))
                || state
                    .description
                    .grills
                    .contains(&(sausage.pos2() + IVec3::NEG_Z))
                || state.get_sausage(sausage.pos2() + IVec3::NEG_Z).is_some())
            {
                let mut sausage = state.sausages.get_mut(i).unwrap();
                sausage.pos += IVec3::NEG_Z;
            }
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

#[derive(Debug)]
#[wasm_bindgen]
pub struct LevelGraph {
    pub(crate) states: HashSet<Arc<LevelState>>,
    pub(crate) edges: Vec<(Arc<LevelState>, Arc<LevelState>)>,
    pub(crate) initial_state: Arc<LevelState>,
    pub(crate) level_description: LevelDescription,
}

/*
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
        #[derive(Serialize, Debug)]
        struct Edge {
            id: usize,
            source: u64,
            target: u64,
            movement: &'static str,
        }
        let mut edges: Vec<Edge> = Vec::new();
        self.states.iter().enumerate().for_each(|(i, s)| {
            if let Some(n) = s.neighbors.get() {
                edges.push(Edge {
                    id: i * 4 + 1,
                    source: s.get_id(),
                    target: n.forward.upgrade().unwrap().get_id(),
                    movement: "forward",
                });
                edges.push(Edge {
                    id: i * 4 + 2,
                    source: s.get_id(),
                    target: n.back.upgrade().unwrap().get_id(),
                    movement: "back",
                });
                edges.push(Edge {
                    id: i * 4 + 3,
                    source: s.get_id(),
                    target: n.right.upgrade().unwrap().get_id(),
                    movement: "right",
                });
                edges.push(Edge {
                    id: i * 4 + 4,
                    source: s.get_id(),
                    target: n.left.upgrade().unwrap().get_id(),
                    movement: "left",
                });
            }
        });
        s.serialize_entry("edges", &edges);
        s.serialize_entry("initial_state", self.initial_state.as_ref());
        s.serialize_entry("level_description", &self.level_description);
        s.end()
    }
}
*/

#[derive(Debug, Clone, Copy, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub enum SausageOrientation {
    Horizontal,
    Vertical,
}
impl From<SausageOrientation> for IVec3 {
    fn from(value: SausageOrientation) -> Self {
        match value {
            SausageOrientation::Horizontal => IVec3::X,
            SausageOrientation::Vertical => IVec3::Y,
        }
    }
}

#[derive(Debug, Clone, Copy, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub struct Sausage {
    pos: IVec3,
    // zero is the side that is down
    cooked: [[u8; 2]; 2],
    pub orientation: SausageOrientation,
}

impl Sausage {
    pub fn check_collision(&self, x: i32, y: i32, z: i32) -> bool {
        let check_pos = IVec3::new(x, y, z);
        check_pos == self.pos || check_pos == self.pos + IVec3::from(self.orientation)
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

    fn pos2(&self) -> IVec3 {
        IVec3::from(self.orientation) + self.pos
    }
}

#[wasm_bindgen]
pub fn solve(level_description: JsValue) -> Result<LevelGraph, JsError> {
    console_error_panic_hook::set_once();

    let parsed: LevelDescription = match serde_wasm_bindgen::from_value(level_description) {
        Ok(d) => d,
        Err(e) => {
            return Err(JsError::new(&format!(
                "error parsing level description: {e:?}"
            )));
        }
    };
    Ok(generate_graph(&parsed))
}

pub fn generate_graph(level_description: &LevelDescription) -> LevelGraph {
    let initial_state = Arc::new(LevelState::from(level_description));
    #[allow(clippy::mutable_key_type)]
    let mut states: HashSet<Arc<LevelState>> = HashSet::new();
    states.insert(Arc::clone(&initial_state));

    let mut exploration_queue: VecDeque<Arc<LevelState>> = VecDeque::new();
    exploration_queue.push_back(Arc::clone(&initial_state));

    let mut explored: HashSet<Arc<LevelState>> = HashSet::new();
    let mut edges: Vec<(Arc<LevelState>, Arc<LevelState>)> = Vec::new();

    while let Some(current_state) = exploration_queue.pop_front() {
        if explored.contains(&current_state) {
            continue;
        }

        match current_state.get_status() {
            LevelStatus::Lost => continue,
            LevelStatus::Solution => continue,
            LevelStatus::Burnt => continue,
            _ => (),
        }

        let new_state = Arc::new(current_state.get_next_state(current_state.player_dir));
        let saved_state = states.get_or_insert(new_state);
        edges.push((Arc::clone(&current_state), Arc::clone(saved_state)));
        exploration_queue.push_back(saved_state.clone());

        let new_state = Arc::new(current_state.get_next_state(-current_state.player_dir));
        let saved_state = states.get_or_insert(new_state);
        edges.push((Arc::clone(&current_state), Arc::clone(saved_state)));
        exploration_queue.push_back(saved_state.clone());

        let new_state =
            Arc::new(current_state.get_next_state(current_state.player_dir.cross(IVec3::Z)));
        let saved_state = states.get_or_insert(new_state);
        edges.push((Arc::clone(&current_state), Arc::clone(saved_state)));
        exploration_queue.push_back(saved_state.clone());

        let new_state =
            Arc::new(current_state.get_next_state(-current_state.player_dir.cross(IVec3::Z)));
        let saved_state = states.get_or_insert(new_state);
        edges.push((Arc::clone(&current_state), Arc::clone(saved_state)));
        exploration_queue.push_back(saved_state.clone());

        explored.insert(Arc::clone(&current_state));
    }

    LevelGraph {
        states,
        edges,
        initial_state,
        level_description: level_description.clone(),
    }
}
