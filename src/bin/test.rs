use std::io::Read;
use stephens_sausage_roll_solver::solver;

fn main() {
    let mut description = String::new();
    std::io::stdin().read_to_string(&mut description).unwrap();

    let solution = solver::generate_graph(&serde_json::from_str(&description).unwrap());

    println!("nodes generated: {}", solution.states.len())
}
