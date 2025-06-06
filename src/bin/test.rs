use std::io::Read;
use stephens_sausage_roll_solver::{graph, solver};

fn main() {
    let description = r#"{"start_pos":[2,2,1],"start_dir":[1,0,0],"ground":[[2,2,0],[3,2,0],[4,2,0],[4,1,0]],"grills":[[5,1,0],[5,2,0],[6,2,0],[6,1,0]],"sausages":[{"pos":[4,1,1],"cooked":[[0,0],[0,0]],"orientation":"Vertical"}]}"#;

    let solution = solver::generate_graph(&serde_json::from_str(&description).unwrap());
    println!("Solution created");
    graph::run(solution);

    //println!("nodes generated: {}", solution.states.len())
}
