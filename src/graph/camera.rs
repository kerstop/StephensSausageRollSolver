use std::f32::consts::PI;

use bevy::{
    input::mouse::{AccumulatedMouseMotion, AccumulatedMouseScroll},
    prelude::*,
};

pub struct CameraPlugin;

impl Plugin for CameraPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, spawn_camera);
        app.add_systems(Update, camera_rig_system);
        app.insert_resource(ClearColor(Color::hsl(0.0, 0.0, 0.8)));
    }
}

fn spawn_camera(mut commands: Commands) {
    commands.spawn(CameraBundle { ..default() });
    commands.spawn(Observer::new(handle_click));
    commands.init_resource::<CameraSettings>();
    commands.spawn((
        DirectionalLight {
            illuminance: 500.0,
            ..default()
        },
        Transform::from_rotation(Quat::from_axis_angle(
            Vec3::new(-1.0, 1.0, 0.0).normalize(),
            0.5 * PI,
        )),
    ));
}

#[derive(Bundle, Default)]
pub struct CameraBundle {
    pub camera: Camera,
    pub camera_render_graph: Camera3d,
    pub rig: CameraRig,
    pub transform: Transform,
}

#[derive(Component, Debug)]
pub struct CameraRig {
    pub target: Option<Entity>,
    pub target_position: Vec3,
    pub pitch: f32,
    pub pitch_delta: f32,
    pub yaw: f32,
    pub yaw_delta: f32,
    pub distance: f32,
}

impl Default for CameraRig {
    fn default() -> Self {
        Self {
            target: Default::default(),
            target_position: Default::default(),
            pitch: Default::default(),
            pitch_delta: Default::default(),
            yaw: Default::default(),
            yaw_delta: Default::default(),
            distance: 200.0,
        }
    }
}

#[derive(Resource, Debug)]
pub struct CameraSettings {
    pub sensitivity: Vec2,
    pub min_distance: f32,
    pub max_distance: f32,
}

impl Default for CameraSettings {
    fn default() -> Self {
        CameraSettings {
            sensitivity: Vec2::new(0.01, 0.01),
            min_distance: 10.0,
            max_distance: 100000.0,
        }
    }
}

pub fn handle_click(
    click: Trigger<Pointer<Pressed>>,
    mut camera: Single<&mut CameraRig>,
    node: Query<&Transform>,
) {
    if click.button == PointerButton::Primary && node.get(click.target).is_ok() {
        camera.target = Some(click.target)
    }
}

pub fn camera_rig_system(
    camera: Single<(&mut CameraRig, &mut Transform)>,
    settings: Res<CameraSettings>,
    mouse_buttons: Res<ButtonInput<MouseButton>>,
    mouse_scroll: Res<AccumulatedMouseScroll>,
    mouse_motion: Res<AccumulatedMouseMotion>,
    entity_transforms: Query<&Transform, Without<CameraRig>>,
) {
    let (mut rig, mut transform) = camera.into_inner();

    if let Some(target) = rig.target {
        match entity_transforms.get(target) {
            Ok(target_position) => rig.target_position = target_position.translation,
            Err(_) => rig.target = None,
        }
    }
    let motion = -mouse_motion.delta * settings.sensitivity;

    if mouse_buttons.pressed(MouseButton::Middle) {
        rig.pitch += motion.y;
        rig.yaw += motion.x;
    }
    if mouse_buttons.just_released(MouseButton::Middle) {
        rig.pitch_delta = motion.y;
        rig.yaw_delta = motion.x;
    }
    if !mouse_buttons.pressed(MouseButton::Middle) {
        rig.pitch += rig.pitch_delta;
        rig.yaw += rig.yaw_delta;
        rig.pitch_delta *= 0.95;
        rig.yaw_delta *= 0.95;
    }

    rig.distance =
        (rig.distance - mouse_scroll.delta.y).clamp(settings.min_distance, settings.max_distance);
    rig.pitch = rig.pitch.clamp(-0.49 * PI, 0.49 * PI);

    transform.translation = rig.target_position
        + Quat::from_rotation_y(rig.yaw)
            * Quat::from_rotation_x(rig.pitch)
            * (Vec3::Z * rig.distance);
    transform.look_at(rig.target_position, Vec3::Y);
}
