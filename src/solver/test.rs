use serde_json::value::Value;

use super::*;
use std::{cell::OnceCell, str::FromStr};

#[test]
fn tests() {
    if let Value::Array(test_cases) =
        serde_json::from_str(include_str!("./test-cases.json")).unwrap()
    {
        for (i, test_case) in test_cases.iter().enumerate() {
            let title = test_case.get("title").unwrap().as_str().unwrap();
            let start = LevelState::from(
                &serde_json::from_value::<LevelDescription>(
                    test_case.get("start").unwrap().clone(),
                )
                .unwrap(),
            );
            let expected = LevelState::from(
                &serde_json::from_value::<LevelDescription>(
                    test_case.get("expected").unwrap().clone(),
                )
                .unwrap(),
            );
            let input_dir = match test_case.get("input_dir").unwrap().as_str().unwrap() {
                "right" => IVec3::X,
                "left" => -IVec3::X,
                "down" => IVec3::Y,
                "up" => -IVec3::Y,
                _ => panic!("unexpected `input_dir` value found"),
            };
            let produced = start.get_next_state(input_dir);
            assert!(
                expected == produced,
                "while running test number {} titled {}\nInput:    {}\nExpected: {}\nProduced: {}",
                i,
                title,
                serde_json::to_string(&start).unwrap(),
                serde_json::to_string(&expected).unwrap(),
                serde_json::to_string(&produced).unwrap()
            );
        }
    };
}
