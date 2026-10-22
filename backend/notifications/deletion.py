"""Deletion rules for review rows with an exclusive, required target."""


def cascade_review(collector, field, sub_objs, using):
    # Each FK is nullable, but the XOR check forbids a review with no target.
    # Normal CASCADE schedules a temporary NULL on immediate-check backends.
    # Treat this edge as required so the collector deletes reviews first instead.
    collector.collect(
        sub_objs,
        source=field.remote_field.model,
        source_attr=field.name,
        nullable=False,
    )
