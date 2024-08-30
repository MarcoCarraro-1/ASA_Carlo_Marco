(define (domain deliverooJS)
    (:requirements :strips :typing :disjunctive-preconditions)
    (:types
        Tile
    )
    (:predicates
        (at ?tile - Tile)
        (up_of ?tileA - Tile ?tileB - Tile)
        (right_of ?tileA - Tile ?tileB - Tile)
        (down_of ?tileA - Tile ?tileB - Tile)
        (left_of ?tileA - Tile ?tileB - Tile)  
    )
    (:action move_up
        :parameters (?tileA - Tile ?tileB - Tile)
        :precondition (and (at ?tileA) (up_of ?tileB ?tileA))
        :effect (and (at ?tileB) (not (at ?tileA)))
    )
    (:action move_right
        :parameters (?tileA - Tile ?tileB - Tile)
        :precondition (and (at ?tileA) (right_of ?tileB ?tileA))
        :effect (and (at ?tileB) (not (at ?tileA)))
    )
    (:action move_down
        :parameters (?tileA - Tile ?tileB - Tile)
        :precondition (and (at ?tileA) (down_of ?tileB ?tileA))
        :effect (and (at ?tileB) (not (at ?tileA)))
    )
    (:action move_left
        :parameters (?tileA - Tile ?tileB - Tile)
        :precondition (and(at ?tileA) (left_of ?tileB ?tileA))
        :effect (and (at ?tileB) (not (at ?tileA)))
    )
)