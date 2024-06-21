export function isInEyesight(myPos, target, parcelObservationDistance)
{
    if(Math.abs(myPos.x - target.x) <= distance && Math.abs(myPos.y - target.y) <= distance)
    {
        return true;
    }
    return false;
}