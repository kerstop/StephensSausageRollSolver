//! this will be important https://www.sccs.swarthmore.edu/users/10/mkelly1/quadtrees.pdf
use std::sync::Arc;

use avian3d::prelude::*;
use bevy::{
    asset::RenderAssetUsages,
    math::prelude::*,
    prelude::*,
    render::{
        extract_component::{ExtractComponent, ExtractComponentPlugin},
        render_graph,
        render_resource::{self},
    },
};
use bevy_egui::EguiPlugin;
use bevy_inspector_egui::{
    prelude::*,
    quick::{ResourceInspectorPlugin, WorldInspectorPlugin},
    InspectorOptions,
};
use wasm_bindgen::prelude::*;

use crate::solver;

mod camera;
mod compute_shader;

#[wasm_bindgen]
pub fn run(graph: solver::LevelGraph) {
    let mut app = App::new();
    app.insert_resource(Graph(graph))
        .init_resource::<PhysicsSettings>()
        .register_type::<PhysicsSettings>()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                canvas: Some("#graph-canvas".into()),
                ..default()
            }),
            ..default()
        }))
        .add_plugins(EguiPlugin {
            enable_multipass_for_primary_context: true,
        })
        .add_plugins(PhysicsPlugins::default())
        .add_plugins(PhysicsPickingPlugin)
        .add_plugins(ResourceInspectorPlugin::<PhysicsSettings>::default())
        .add_plugins(WorldInspectorPlugin::new())
        .add_plugins(camera::CameraPlugin)
        .add_plugins(ExtractComponentPlugin::<GraphEdgeNeighbors>::default())
        .add_systems(
            Startup,
            (
                setup_nodes,
                setup_edges.after(setup_nodes),
                setup_edges_mesh,
            ),
        )
        .add_systems(
            Update,
            (
                calculate_graph_spring_force,
                calculate_graph_repulsion_force,
                move_graph_nodes,
                generate_graph_edge_mesh,
            )
                .chain(),
        );
    app.run();
}

fn setup_nodes(
    mut commands: Commands,
    mut mesh_assets: ResMut<Assets<Mesh>>,
    mut material_assets: ResMut<Assets<StandardMaterial>>,
    graph: Res<Graph>,
) {
    let graph = &graph.into_inner().0;
    let mesh = mesh_assets.add(Mesh::from(Sphere::new(1.0)));
    let material = material_assets.add(StandardMaterial::from_color(Color::hsl(0.0, 0.0, 0.4)));

    let spawn_volume = Sphere::new(10.0);

    let mut rng = rand::thread_rng();
    for state in &graph.states {
        let position: Vec3 = spawn_volume.sample_boundary(&mut rng);
        commands.spawn(GraphNodeBundle {
            mesh: mesh.clone().into(),
            material: material.clone().into(),
            transform: Transform::from_translation(position),
            colider: Collider::sphere(0.5),
            data: GraphNodeData(Arc::clone(state)),
            velocity: GraphNodeVelocity(Vec3::ZERO),
        });
    }
}

fn setup_edges(mut commands: Commands, nodes: Query<(Entity, &GraphNodeData)>, graph: Res<Graph>) {
    let graph = &graph.into_inner().0;
    for (n1, n2) in graph.edges.iter() {
        let (entity1, _) = nodes.iter().find(|(_, data)| data.0 == *n1).unwrap();
        let (entity2, _) = nodes.iter().find(|(_, data)| data.0 == *n2).unwrap();
        commands.spawn(GraphEdgeBundle {
            neighbors: GraphEdgeNeighbors(entity1, entity2),
        });
    }
}

fn setup_edges_mesh(
    mut commands: Commands,
    mut material: ResMut<Assets<StandardMaterial>>,
    mut meshes: ResMut<Assets<Mesh>>,
) {
    commands.spawn((
        MeshMaterial3d(material.add(StandardMaterial::from_color(Color::BLACK))),
        Mesh3d(
            meshes.add(
                Mesh::new(
                    render_resource::PrimitiveTopology::TriangleList,
                    RenderAssetUsages::all(),
                )
                .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, Vec::<Vec3>::new())
                .with_inserted_attribute(Mesh::ATTRIBUTE_NORMAL, Vec::<Vec3>::new()),
            ),
        ),
        GraphEdgeMesh,
    ));
}

#[derive(Resource, Reflect, InspectorOptions)]
#[reflect(Resource, InspectorOptions)]
struct PhysicsSettings {
    graph_spring_target_distance: f32,
    graph_spring_force: f32,
    centralizing_force: f32,
    repulsion_force: f32,
}

impl Default for PhysicsSettings {
    fn default() -> Self {
        Self {
            graph_spring_target_distance: 10.0,
            graph_spring_force: 0.2,
            centralizing_force: 0.00001,
            repulsion_force: 0.3,
        }
    }
}

fn calculate_graph_spring_force(
    edges: Query<&GraphEdgeNeighbors>,
    mut nodes: Query<(&Transform, &mut GraphNodeVelocity)>,
    physics_settings: Res<PhysicsSettings>,
    time: Res<Time<Fixed>>,
) {
    for GraphEdgeNeighbors(entity_a, entity_b) in edges {
        if entity_a == entity_b {
            continue;
        }
        let (transform_a, _) = nodes.get(*entity_a).unwrap();
        let (transform_b, _) = nodes.get(*entity_b).unwrap();

        let a_to_b = transform_b.translation - transform_a.translation;
        let spring_force_a = a_to_b
            .try_normalize()
            .or_else(|| Some(Sphere::new(1.0).sample_boundary(&mut rand::thread_rng())))
            .unwrap()
            * (a_to_b.length() - physics_settings.graph_spring_target_distance)
            * physics_settings.graph_spring_force
            * time.delta_secs()
            / 2.0;
        let spring_force_b = -a_to_b
            .try_normalize()
            .or_else(|| Some(Sphere::new(1.0).sample_boundary(&mut rand::thread_rng())))
            .unwrap()
            * (a_to_b.length() - physics_settings.graph_spring_target_distance)
            * physics_settings.graph_spring_force
            * time.delta_secs()
            / 2.0;

        let centralizing_a = transform_a.translation.length_squared()
            * physics_settings.centralizing_force
            * time.delta_secs()
            * -transform_a.translation.normalize();
        let centralizing_b = transform_b.translation.length_squared()
            * physics_settings.centralizing_force
            * time.delta_secs()
            * -transform_b.translation.normalize();

        let (_, mut velocity_a) = nodes.get_mut(*entity_a).unwrap();
        **velocity_a += spring_force_a;
        **velocity_a += centralizing_a;
        let (_, mut velocity_b) = nodes.get_mut(*entity_b).unwrap();
        **velocity_b += spring_force_b;
        **velocity_b += centralizing_b;
    }
}

fn calculate_graph_repulsion_force(
    positions: Query<(Entity, &Transform), With<GraphNodeVelocity>>,
    mut velocities: Query<(Entity, &mut GraphNodeVelocity, &Transform)>,
    physics_settings: Res<PhysicsSettings>,
) {
    for (node_a, mut node_a_velocity, node_a_transform) in velocities.iter_mut() {
        for (node_b, node_b_transform) in positions.iter() {
            if node_a == node_b {
                continue;
            }
            let a_to_b = node_b_transform.translation - node_a_transform.translation;
            **node_a_velocity += -a_to_b
                .try_normalize()
                .or_else(|| Some(Sphere::new(1.0).sample_boundary(&mut rand::thread_rng())))
                .unwrap()
                * (1.0 / a_to_b.length_squared())
                * physics_settings.repulsion_force
                / 2.0;
        }
    }
}

fn move_graph_nodes(nodes: Query<(&mut Transform, &mut GraphNodeVelocity)>) {
    for (mut transform, mut velocity) in nodes {
        **velocity = velocity.clamp_length_max(100.0);
        transform.translation += **velocity;
        **velocity *= 0.80;
    }
}

struct Graph(solver::LevelGraph);
impl Resource for Graph {}

#[derive(Bundle)]
struct GraphNodeBundle {
    mesh: Mesh3d,
    material: MeshMaterial3d<StandardMaterial>,
    transform: Transform,
    colider: Collider,
    data: GraphNodeData,
    velocity: GraphNodeVelocity,
}

#[derive(Component, DerefMut, Deref)]
struct GraphNodeVelocity(Vec3);

#[derive(Component)]
struct GraphNodeData(Arc<solver::LevelState>);

#[derive(Bundle)]
struct GraphEdgeBundle {
    neighbors: GraphEdgeNeighbors,
}

#[derive(Component, ExtractComponent, Clone, Copy)]
struct GraphEdgeNeighbors(Entity, Entity);

#[derive(Component)]
struct GraphEdgeMesh;

fn generate_graph_edge_mesh(
    neighbors: Query<&GraphEdgeNeighbors>,
    nodes: Query<&Transform>,
    mesh_container: Single<&Mesh3d, With<GraphEdgeMesh>>,
    mut meshes: ResMut<Assets<Mesh>>,
    camera: Single<&Transform, With<Camera>>,
) {
    let camera_position = camera.translation;
    let mut tris: Vec<Vec3> = Vec::new();
    let mut normals: Vec<Vec3> = Vec::new();
    for GraphEdgeNeighbors(e1, e2) in neighbors {
        let p1 = nodes.get(*e1).unwrap().translation;
        let p2 = nodes.get(*e2).unwrap().translation;

        let p1_p2 = (p2 - p1).try_normalize().unwrap_or(Vec3::Z);
        let p1_camera = (camera_position - p1).normalize();
        let up = p1_camera.cross(p1_p2).normalize();

        tris.push(p1 + up * 0.5);
        tris.push(p1 - up * 0.5);
        tris.push(p2 - p1_camera * 0.05);
        normals.push(up + p1_camera * 0.05);
        normals.push(-up + p1_camera * 0.05);
        normals.push(p1_camera);
    }

    let mesh = meshes.get_mut(&mesh_container.0).unwrap();
    mesh.insert_attribute(Mesh::ATTRIBUTE_POSITION, tris);
    mesh.insert_attribute(Mesh::ATTRIBUTE_NORMAL, normals);
}
