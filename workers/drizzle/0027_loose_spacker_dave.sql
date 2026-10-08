ALTER TABLE `students` ADD `form_class_id` integer REFERENCES `form_classes`(`id`) ON DELETE cascade;
